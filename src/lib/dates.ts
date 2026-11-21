const WEEKDAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const
export const DEFAULT_TIME_ZONE = "Asia/Manila"

export function isValidTimeZone(value: string) {
  if (!value || value.length > 100 || /^[+-]/.test(value)) return false
  try { new Intl.DateTimeFormat("en", { timeZone: value }); return true } catch { return false }
}

function dateFormatter(timeZone: string) {
  return new Intl.DateTimeFormat("en", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
}

function formatCalendarDate(date: Date, formatter: Intl.DateTimeFormat) {
  const parts = formatter.formatToParts(date)
  const part = (type: string) => parts.find((value) => value.type === type)!.value
  return `${part("year")}-${part("month")}-${part("day")}`
}

export function toDateInTimeZone(instant: Date, timeZone: string) {
  return formatCalendarDate(instant, dateFormatter(timeZone))
}

/** First instant of this civil day and the next, including midnight/DST jumps. */
export function getDayBoundsInTimeZone(dateISO: string, timeZone: string) {
  const anchor = new Date(`${dateISO}T00:00:00.000Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO) || !Number.isFinite(anchor.getTime()) || anchor.toISOString().slice(0, 10) !== dateISO) throw new Error("Invalid calendar date")
  const formatter = dateFormatter(timeZone)
  function boundary(day: string, utc: number) {
    // Search seconds within ±36 hours. This also handles days without midnight.
    let low = utc / 1000 - 36 * 3600
    let high = utc / 1000 + 36 * 3600
    while (low < high) {
      const middle = Math.floor((low + high) / 2)
      if (formatCalendarDate(new Date(middle * 1000), formatter) < day) low = middle + 1
      else high = middle
    }
    return new Date(low * 1000).toISOString()
  }
  const next = new Date(anchor)
  next.setUTCDate(next.getUTCDate() + 1)
  return { start: boundary(dateISO, anchor.getTime()), end: boundary(next.toISOString().slice(0, 10), next.getTime()) }
}
const MONTH_LABELS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
] as const
const FULL_MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const

/**
 * Local calendar date as YYYY-MM-DD. All planner/recurrence code compares
 * and steps dates as these plain strings (or via the helpers below) instead
 * of constructing `Date` objects from date-only strings — `new
 * Date("2026-08-17")` parses as UTC midnight, which shifts to the previous
 * day in any timezone behind UTC. Building the Date from Y/M/D components
 * (as this file does throughout) always stays in local time.
 */
export function toISODate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Local-time-safe inverse of toISODate: builds the Date from Y/M/D
 * components instead of `new Date("2026-08-17")`, which parses as UTC
 * midnight and shifts to the previous day in any timezone behind UTC.
 * Exported for UI code (e.g. the themed date picker) that needs to hand a
 * `Date` to a calendar widget while still treating the ISO string as the
 * source of truth.
 */
export function parseISODate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function addDaysISO(iso: string, days: number) {
  const date = parseISODate(iso)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

export function addMonthsISO(iso: string, months: number) {
  const date = parseISODate(iso)
  const originalDay = date.getDate()
  date.setDate(1)
  date.setMonth(date.getMonth() + months)
  const daysInTargetMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()

  if (originalDay > daysInTargetMonth) {
    return null
  }

  date.setDate(originalDay)
  return toISODate(date)
}

export function getWeekdayIndex(iso: string) {
  return parseISODate(iso).getDay()
}

/** Whole days from `fromIso` to `toIso` (positive when `toIso` is later). */
export function daysBetweenISO(fromIso: string, toIso: string) {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((parseISODate(toIso).getTime() - parseISODate(fromIso).getTime()) / msPerDay)
}

export function isWeekend(iso: string) {
  const day = getWeekdayIndex(iso)
  return day === 0 || day === 6
}

export function formatColumnWeekday(iso: string) {
  return WEEKDAY_LABELS[getWeekdayIndex(iso)]
}

export function formatColumnMonthDay(iso: string) {
  const date = parseISODate(iso)
  return `${MONTH_LABELS[date.getMonth()]} ${date.getDate()}`
}

/** "August 14, 2026" — deterministic (no Intl/locale), safe for aria-labels rendered on both server and client. */
export function formatFullDate(iso: string) {
  const date = parseISODate(iso)
  return `${FULL_MONTH_LABELS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

/** "Aug 2026" — monthly bucket label for the Analytics All Time trend charts. `iso` may be any date within the month. */
export function formatMonthYearLabel(iso: string) {
  const date = parseISODate(iso)
  return `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`
}
