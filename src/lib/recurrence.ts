import type { createSupabaseServerClient } from "@/lib/supabase/server"
import { addDaysISO, addMonthsISO, daysBetweenISO, isWeekend } from "@/lib/dates"

export const RECURRENCE_OPTIONS = ["none", "daily", "weekdays", "weekly", "monthly"] as const
export type RecurrenceOption = (typeof RECURRENCE_OPTIONS)[number]

export const TASK_RECURRENCE_TYPES = ["daily", "weekdays", "weekly", "monthly"] as const
export type TaskRecurrenceType = (typeof TASK_RECURRENCE_TYPES)[number]

/**
 * Kept for planner column compatibility. Recurring tasks are rolling now, so
 * this is no longer used as a generation window.
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

export function formatRecurrenceLabel(recurrenceType: TaskRecurrenceType) {
  switch (recurrenceType) {
    case "daily":
      return "Repeats daily"
    case "weekdays":
      return "Repeats on weekdays"
    case "weekly":
      return "Repeats weekly"
    case "monthly":
      return "Repeats monthly"
  }
}

/**
 * First valid recurrence date strictly after `afterDate`.
 *
 * Monthly recurrence keeps the original day-of-month and skips months that
 * do not contain it: Jan 31 rolls to Mar 31 in a non-leap year, while Jan 29
 * rolls to Feb 29 in a leap year and Mar 29 otherwise.
 */
export function getNextOccurrenceDate(
  recurrenceType: TaskRecurrenceType,
  startDate: string,
  afterDate: string,
) {
  if (recurrenceType === "monthly") {
    const maxIterations = 600
    for (let monthOffset = 0; monthOffset < maxIterations; monthOffset++) {
      const candidate = addMonthsISO(startDate, monthOffset)
      if (candidate !== null && candidate > afterDate) {
        return candidate
      }
    }

    throw new Error("Unable to calculate the next monthly occurrence.")
  }

  const stepDays = recurrenceType === "weekly" ? 7 : 1
  const daysSinceStart = Math.max(0, daysBetweenISO(startDate, afterDate))
  let cursor = addDaysISO(startDate, (Math.floor(daysSinceStart / stepDays) + 1) * stepDays)

  const maxIterations = 400
  for (let i = 0; i < maxIterations; i++) {
    if (recurrenceType !== "weekdays" || !isWeekend(cursor)) {
      return cursor
    }

    cursor = addDaysISO(cursor, 1)
  }

  throw new Error("Unable to calculate the next occurrence.")
}

/**
 * Pure occurrence-date generator kept for legacy tests and any read-only
 * callers. Rolling recurrence no longer uses it to insert future task rows.
 */
export function getOccurrenceDates(
  recurrenceType: TaskRecurrenceType,
  startDate: string,
  rangeStart: string,
  rangeEnd: string,
): string[] {
  const dates: string[] = []

  if (recurrenceType === "monthly") {
    const maxIterations = 600
    for (let monthOffset = 0; monthOffset < maxIterations; monthOffset++) {
      const candidate = addMonthsISO(startDate, monthOffset)
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

export async function synchronizeRecurringTaskOccurrences(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  userId: string,
) {
  void supabase
  void userId
  // Rolling recurrence keeps one active task row per series. This legacy
  // synchronization boundary intentionally no-ops so page loads cannot create
  // future copies or stacked overdue occurrences.
}
