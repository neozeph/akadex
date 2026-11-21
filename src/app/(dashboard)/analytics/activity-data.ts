import { cookies } from "next/headers"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { addDaysISO, addMonthsISO, formatColumnMonthDay, formatMonthYearLabel, toDateInTimeZone } from "@/lib/dates"
import { getUserTimeZone } from "@/lib/user-timezone"
import { throwPublicError } from "@/lib/server-errors"
import { measureOperation } from "@/lib/performance"

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

export function getActivityAnalyticsData(userId: string, range: AnalyticsRange) {
  return measureOperation("activity-analytics", () => loadActivityAnalyticsData(userId, range))
}

type ActivityReport = {
  totalTaskCount:number; activeNow:number; overdueNow:number;
  completedCount:number; legacyUndatedCompletionCount:number;
  completedSessionCount:number; focusTimeSeconds:number;
  taskDays:{dateISO:string;value:number}[]; focusDays:{dateISO:string;value:number}[];
}

async function loadActivityAnalyticsData(userId:string,range:AnalyticsRange){
  const cookieStore=await cookies()
  const supabase=createSupabaseServerClient({getAll:()=>cookieStore.getAll()})
  const timeZone=await getUserTimeZone(userId)
  const todayISO=toDateInTimeZone(new Date(),timeZone)
  const {data,error}=await supabase.rpc("activity_report",{p_today:todayISO,p_timezone:timeZone,p_range:range})
  const counts=["totalTaskCount","activeNow","overdueNow","completedCount","legacyUndatedCompletionCount","completedSessionCount","focusTimeSeconds"]
  if(error || !data || typeof data!=="object" || !Array.isArray(data.taskDays) || !Array.isArray(data.focusDays) || counts.some(key=>!Number.isSafeInteger(data[key]) || data[key]<0)){
    throwPublicError("analytics.loadActivityReport",error??new Error("Missing aggregate"),"Unable to load your analytics right now.")
  }
  const report=data as ActivityReport
  const rangeStartISO=range==="all"?null:addDaysISO(todayISO,range==="7d"?-6:-29)
  return {
    range,totalTaskCount:report.totalTaskCount,activeNow:report.activeNow,overdueNow:report.overdueNow,
    completedCount:report.completedCount,legacyUndatedCompletionCount:report.legacyUndatedCompletionCount,
    hasLegacyUndatedCompletions:report.legacyUndatedCompletionCount>0,
    taskTrend:buildTrend(report.taskDays,range,rangeStartISO,todayISO),
    focusTimeSeconds:report.focusTimeSeconds,completedSessionCount:report.completedSessionCount,
    averageSessionSeconds:report.completedSessionCount?report.focusTimeSeconds/report.completedSessionCount:0,
    focusTrend:buildTrend(report.focusDays,range,rangeStartISO,todayISO).map(bucket=>({...bucket,value:Math.round(bucket.value/60)})),
  }
}
