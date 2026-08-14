import { describe, expect, it } from "vitest"
import { getOccurrenceDates } from "@/lib/recurrence"

describe("getOccurrenceDates", () => {
  it("returns every day in range for daily recurrence", () => {
    expect(getOccurrenceDates("daily", "2026-08-14", "2026-08-14", "2026-08-17")).toEqual([
      "2026-08-14",
      "2026-08-15",
      "2026-08-16",
      "2026-08-17",
    ])
  })

  it("excludes Saturdays and Sundays for weekdays recurrence", () => {
    // 2026-08-14 is Friday; the range spans the weekend of Aug 15-16.
    expect(getOccurrenceDates("weekdays", "2026-08-14", "2026-08-14", "2026-08-18")).toEqual([
      "2026-08-14",
      "2026-08-17",
      "2026-08-18",
    ])
  })

  it("keeps the original weekday for weekly recurrence", () => {
    expect(getOccurrenceDates("weekly", "2026-08-03", "2026-08-01", "2026-08-24")).toEqual([
      "2026-08-03",
      "2026-08-10",
      "2026-08-17",
      "2026-08-24",
    ])
  })

  it("fast-forwards the cursor when rangeStart is well after startDate", () => {
    // Series started weeks ago; only occurrences inside the requested window are returned.
    expect(getOccurrenceDates("weekly", "2026-01-06", "2026-08-01", "2026-08-15")).toEqual([
      "2026-08-04",
      "2026-08-11",
    ])
  })

  it("keeps the same day-of-month for monthly recurrence", () => {
    expect(getOccurrenceDates("monthly", "2026-01-15", "2026-01-01", "2026-04-30")).toEqual([
      "2026-01-15",
      "2026-02-15",
      "2026-03-15",
      "2026-04-15",
    ])
  })

  it("skips months that have no matching day-of-month instead of shifting", () => {
    // Jan 31 has no Feb 31 equivalent, so February is skipped entirely.
    expect(getOccurrenceDates("monthly", "2026-01-31", "2026-01-01", "2026-03-31")).toEqual([
      "2026-01-31",
      "2026-03-31",
    ])
  })

  it("returns an empty array when the range is entirely before the start date", () => {
    expect(getOccurrenceDates("daily", "2026-08-14", "2026-08-01", "2026-08-13")).toEqual([])
  })
})
