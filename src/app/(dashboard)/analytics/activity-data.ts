import { cookies } from "next/headers"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { addDaysISO, addMonthsISO, formatColumnMonthDay, formatMonthYearLabel, parseISODate, toISODate } from "@/lib/dates"
import { throwPublicError } from "@/lib/server-errors"

export const ANALYTICS_RANGES = ["7d", "30d", "all"] as const
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number]

export const DEFAULT_ANALYTICS_RANGE: AnalyticsRange = "30d"

/** Invalid/missing values fall back to the default rather than erroring — matches other filter params in this app (e.g. Tasks search). */
export function parseAnalyticsRange(value: string | undefined): AnalyticsRange {
  return (ANALYTICS_RANGES as readonly string[]).includes(value ?? "")
    ? (value as AnalyticsRange)
    : DEFAULT_ANALYTICS_RANGE
}

export type TrendBucket = {
  key: string
  label: string
  value: number
}

/** Midnight (server-local time) for a given YYYY-MM-DD, as a timestamptz-comparable ISO string. Same technique pomodoro/data.ts's startOfToday() already uses. */
function startOfDayTimestamp(iso: string) {
  const date = parseISODate(iso)
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}

/** A timestamptz value's calendar day, in the same server-local frame `toISODate(new Date())` uses elsewhere — so "today" and "which day did this happen on" are always computed the same way. */
function timestampToISODate(timestamp: string) {
  return toISODate(new Date(timestamp))
}

export function buildDailyBuckets(entries: { dateISO: string; value: number }[], startISO: string, endISO: string): TrendBucket[] {
  const totals = new Map<string, number>()
  for (const entry of entries) {
    totals.set(entry.dateISO, (totals.get(entry.dateISO) ?? 0) + entry.value)
  }

  const buckets: TrendBucket[] = []
  let cursor = startISO
  // Bounded by construction: startISO/endISO always come from a fixed 7 or
  // 30 day window, or from real recorded activity — never unbounded input.
  while (cursor <= endISO) {
    buckets.push({ key: cursor, label: formatColumnMonthDay(cursor), value: totals.get(cursor) ?? 0 })
    cursor = addDaysISO(cursor, 1)
  }

  return buckets
}

export function buildMonthlyBuckets(entries: { dateISO: string; value: number }[], startISO: string, endISO: string): TrendBucket[] {
  const totals = new Map<string, number>()
  for (const entry of entries) {
    const monthKey = entry.dateISO.slice(0, 7)
    totals.set(monthKey, (totals.get(monthKey) ?? 0) + entry.value)
  }

  const buckets: TrendBucket[] = []
  let cursor = `${startISO.slice(0, 7)}-01`
  const endMonth = endISO.slice(0, 7)

  while (cursor.slice(0, 7) <= endMonth) {
    const monthKey = cursor.slice(0, 7)
    buckets.push({ key: monthKey, label: formatMonthYearLabel(cursor), value: totals.get(monthKey) ?? 0 })
    // addMonthsISO can only return null when the anchor day doesn't exist in
    // the target month (e.g. Jan 31 -> Feb) — the anchor here is always "-01", which every month has.
    cursor = addMonthsISO(cursor, 1) as string
  }

  return buckets
}

/**
 * Buckets a range-scoped series the same way for tasks and focus sessions:
 * daily for 7d/30d (kept identical rather than switching to weekly buckets
 * for 30d, so the aggregation logic never has to branch on an "is this
 * still readable" judgment call), monthly for All Time. Returns an empty
 * array when there's no dated activity at all, letting the caller render an
 * honest empty state instead of a zero-filled chart with a fabricated
 * range.
 */
function buildTrend(
  entries: { dateISO: string; value: number }[],
  range: AnalyticsRange,
  rangeStartISO: string | null,
  todayISO: string,
): TrendBucket[] {
  if (range !== "all") {
    return buildDailyBuckets(entries, rangeStartISO as string, todayISO)
  }

  if (entries.length === 0) {
    return []
  }

  const earliestISO = entries.reduce((earliest, entry) => (entry.dateISO < earliest ? entry.dateISO : earliest), entries[0].dateISO)
  return buildMonthlyBuckets(entries, earliestISO, todayISO)
}

export async function getActivityAnalyticsData(userId: string, range: AnalyticsRange) {
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient({
    getAll() {
      return cookieStore.getAll()
    },
  })

  const todayISO = toISODate(new Date())

  // One tasks query, one pomodoro_sessions query — unfiltered by date range
  // at the SQL level on purpose: "Active now"/"Overdue now" need current
  // state regardless of the selected range, so everything is fetched once
  // and both current-state and range-scoped figures are derived from the
  // same in-memory data, rather than risking two queries drifting apart.
  const [tasksResult, sessionsResult] = await Promise.all([
    supabase.from("tasks").select("id, status, due_date, completed_at").eq("user_id", userId),
    supabase
      .from("pomodoro_sessions")
      .select("id, duration, ended_at")
      .eq("user_id", userId)
      .eq("completed", true),
  ])

  if (tasksResult.error) {
    throwPublicError("analytics.loadTaskActivity", tasksResult.error, "Unable to load your analytics right now.")
  }

  if (sessionsResult.error) {
    throwPublicError("analytics.loadFocusActivity", sessionsResult.error, "Unable to load your analytics right now.")
  }

  const tasks = tasksResult.data ?? []
  const sessions = sessionsResult.data ?? []

  // --- Current-state task metrics (never affected by the timeframe) ---
  const activeNow = tasks.filter((task) => task.status !== "done").length
  const overdueNow = tasks.filter(
    (task) => task.status !== "done" && task.due_date !== null && task.due_date < todayISO,
  ).length

  // --- Range boundary ---
  const rangeStartISO = range === "all" ? null : addDaysISO(todayISO, range === "7d" ? -6 : -29)
  const rangeStartTimestamp = rangeStartISO ? startOfDayTimestamp(rangeStartISO) : null

  // --- Task completions ---
  const timestampedCompletions = tasks.filter(
    (task): task is typeof task & { completed_at: string } => task.status === "done" && task.completed_at !== null,
  )
  const legacyUndatedCompletionCount = tasks.filter(
    (task) => task.status === "done" && task.completed_at === null,
  ).length

  const completionsInRange = rangeStartTimestamp
    ? timestampedCompletions.filter((task) => task.completed_at >= rangeStartTimestamp)
    : timestampedCompletions

  const taskTrend = buildTrend(
    completionsInRange.map((task) => ({ dateISO: timestampToISODate(task.completed_at), value: 1 })),
    range,
    rangeStartISO,
    todayISO,
  )

  // --- Focus sessions ---
  const sessionsInRange = rangeStartTimestamp
    ? sessions.filter((session) => session.ended_at >= rangeStartTimestamp)
    : sessions

  const focusTimeSeconds = sessionsInRange.reduce((sum, session) => sum + Number(session.duration), 0)
  const completedSessionCount = sessionsInRange.length
  const averageSessionSeconds = completedSessionCount > 0 ? focusTimeSeconds / completedSessionCount : 0

  const focusTrend = buildTrend(
    sessionsInRange.map((session) => ({ dateISO: timestampToISODate(session.ended_at), value: Number(session.duration) })),
    range,
    rangeStartISO,
    todayISO,
  ).map((bucket) => ({ ...bucket, value: Math.round(bucket.value / 60) })) // seconds -> minutes, once per bucket

  return {
    range,
    totalTaskCount: tasks.length,
    activeNow,
    overdueNow,
    completedCount: completionsInRange.length,
    hasLegacyUndatedCompletions: legacyUndatedCompletionCount > 0,
    legacyUndatedCompletionCount,
    taskTrend,
    focusTimeSeconds,
    completedSessionCount,
    averageSessionSeconds,
    focusTrend,
  }
}
