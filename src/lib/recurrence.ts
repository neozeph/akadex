import type { createSupabaseServerClient } from "@/lib/supabase/server"
import { addDaysISO, addMonthsISO, daysBetweenISO, isWeekend, toISODate } from "@/lib/dates"
import type { TaskPriority } from "@/lib/tasks"

export const RECURRENCE_OPTIONS = ["none", "daily", "weekdays", "weekly", "monthly"] as const
export type RecurrenceOption = (typeof RECURRENCE_OPTIONS)[number]

export const TASK_RECURRENCE_TYPES = ["daily", "weekdays", "weekly", "monthly"] as const
export type TaskRecurrenceType = (typeof TASK_RECURRENCE_TYPES)[number]

/**
 * Bounded rolling window for both the planner's date columns and how far
 * ahead recurring occurrences are materialized. Four weeks is comfortably
 * inside the "4-8 weeks" range called for by the sprint brief and keeps a
 * single source of truth between the UI and the generator.
 */
export const PLANNER_HORIZON_DAYS = 27

export function formatRecurrenceOption(option: RecurrenceOption) {
  switch (option) {
    case "none":
      return "Does not repeat"
    case "daily":
      return "Daily"
    case "weekdays":
      return "Weekdays"
    case "weekly":
      return "Weekly"
    case "monthly":
      return "Monthly"
  }
}

/**
 * Pure occurrence-date generator: steps forward from `startDate` by the
 * recurrence's natural interval and returns every date that lands inside
 * [rangeStart, rangeEnd] (inclusive). Never reads the clock or touches the
 * database — safe to unit-test and safe to call from server-rendering code.
 */
export function getOccurrenceDates(
  recurrenceType: TaskRecurrenceType,
  startDate: string,
  rangeStart: string,
  rangeEnd: string,
): string[] {
  const dates: string[] = []

  if (recurrenceType === "monthly") {
    // Bounded to a generous 50 years of months; the actual loop always
    // exits far sooner once candidates pass rangeEnd (our horizon is weeks).
    const maxIterations = 600
    for (let monthOffset = 0; monthOffset < maxIterations; monthOffset++) {
      const candidate = addMonthsISO(startDate, monthOffset)
      // Month has no matching day-of-month (e.g. day 31 in Feb) — skip it
      // rather than shifting to a different day, keeping the schedule
      // predictable ("same day each month" or nothing that month).
      if (candidate === null) {
        continue
      }
      if (candidate > rangeEnd) {
        break
      }
      if (candidate >= rangeStart) {
        dates.push(candidate)
      }
    }
    return dates
  }

  const stepDays = recurrenceType === "weekly" ? 7 : 1

  // Fast-forward the cursor to the first candidate at/after rangeStart that
  // still lands on the recurrence's phase (e.g. same weekday for "weekly"),
  // instead of stepping one interval at a time from a potentially
  // far-in-the-past startDate.
  let cursor = startDate
  if (rangeStart > startDate) {
    const daysBetween = daysBetweenISO(startDate, rangeStart)
    const stepsNeeded = Math.ceil(daysBetween / stepDays)
    cursor = addDaysISO(startDate, stepsNeeded * stepDays)
  }

  const maxIterations = 400
  for (let i = 0; i < maxIterations && cursor <= rangeEnd; i++) {
    const includeDate = recurrenceType === "weekdays" ? !isWeekend(cursor) : true
    if (includeDate) {
      dates.push(cursor)
    }
    cursor = addDaysISO(cursor, stepDays)
  }

  return dates
}

type TaskSeriesRow = {
  id: string
  subject_id: string | null
  title: string
  description: string | null
  tags: string[] | null
  priority: TaskPriority
  recurrence_type: TaskRecurrenceType
  start_date: string
  last_generated_through: string | null
}

/**
 * Explicit recurrence synchronization boundary. Materializes due occurrences
 * for every `active` series belonging to `userId`, up to the rolling
 * horizon. This is a data-layer mutation, not a render-time side effect — it
 * must be called from an explicit server-side step (a route's data loader,
 * a Server Action) *before* that step reads planner data, never from inside
 * JSX/mapped render logic or a client useEffect.
 *
 * Deliberately NOT a "use server" export — it trusts the `supabase` client
 * and `userId` it's given, so it must only ever be called from server-only
 * code that has already authenticated the caller (via getAuthenticatedUser())
 * and scoped both values to them. Exposing this directly as a Server Action
 * would let a client supply an arbitrary userId.
 *
 * Inactive series (`active = false`) are skipped entirely: no new
 * occurrences are generated and their checkpoint is left untouched, but
 * existing/historical occurrence rows are never modified here.
 *
 * Idempotent via two layers: `last_generated_through` is a checkpoint so a
 * date already covered by a previous run is never re-attempted (this is
 * also what stops a deleted occurrence from silently reappearing), and the
 * `(series_id, due_date)` unique index is a defense-in-depth backstop
 * against concurrent requests racing the same not-yet-checkpointed window.
 */
export async function synchronizeRecurringTaskOccurrences(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  userId: string,
) {
  const today = toISODate(new Date())
  const horizonEnd = addDaysISO(today, PLANNER_HORIZON_DAYS)

  const { data: seriesRows } = await supabase
    .from("task_series")
    .select(
      "id, subject_id, title, description, tags, priority, recurrence_type, start_date, last_generated_through",
    )
    .eq("user_id", userId)
    .eq("active", true)
    .or(`last_generated_through.is.null,last_generated_through.lt.${horizonEnd}`)

  if (!seriesRows || seriesRows.length === 0) {
    return
  }

  await Promise.all((seriesRows as TaskSeriesRow[]).map(async (series) => {
    const rangeStart = series.last_generated_through
      ? addDaysISO(series.last_generated_through, 1)
      : series.start_date

    if (rangeStart > horizonEnd) {
      // Series doesn't start until after the current horizon — nothing to
      // generate yet, and the checkpoint stays untouched so a future run
      // (once the horizon reaches start_date) picks it up correctly.
      return
    }

    const occurrenceDates = getOccurrenceDates(
      series.recurrence_type,
      series.start_date,
      rangeStart,
      horizonEnd,
    )

    if (occurrenceDates.length > 0) {
      const rows = occurrenceDates.map((dueDate) => ({
        user_id: userId,
        series_id: series.id,
        subject_id: series.subject_id,
        title: series.title,
        description: series.description,
        tags: series.tags ?? [],
        priority: series.priority,
        due_date: dueDate,
        status: "todo" as const,
      }))

      const { error: upsertError } = await supabase.from("tasks").upsert(rows, {
        onConflict: "series_id,due_date",
        ignoreDuplicates: true,
      })

      // If the insert failed, don't advance the checkpoint past this
      // window — that would permanently skip generating these occurrences.
      // Leave it as-is so the next run (next page load) retries the same
      // range; other series still get processed this run.
      if (upsertError) {
        return
      }
    }

    await supabase
      .from("task_series")
      .update({ last_generated_through: horizonEnd })
      .eq("id", series.id)
      .eq("user_id", userId)
  }))
}
