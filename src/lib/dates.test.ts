import { describe, expect, it } from "vitest"
import {
  addDaysISO,
  addMonthsISO,
  daysBetweenISO,
  isWeekend,
  toISODate,
  isValidTimeZone,
  toDateInTimeZone,
  getDayBoundsInTimeZone,
} from "@/lib/dates"

describe("account calendar boundaries", () => {
  it("validates timezone identifiers rather than fixed offsets or arbitrary input", () => {
    for (const zone of ["Asia/Manila", "America/New_York", "UTC"]) expect(isValidTimeZone(zone)).toBe(true)
    for (const zone of ["", "not/a-zone", "+08:00", "x".repeat(200)]) expect(isValidTimeZone(zone)).toBe(false)
  })
  it("changes the Manila date exactly at midnight", () => {
    expect(toDateInTimeZone(new Date("2026-11-19T15:59:59.999Z"), "Asia/Manila")).toBe("2026-11-19")
    expect(toDateInTimeZone(new Date("2026-11-19T16:00:00Z"), "Asia/Manila")).toBe("2026-11-20")
    expect(getDayBoundsInTimeZone("2026-11-20", "Asia/Manila")).toEqual({ start: "2026-11-19T16:00:00.000Z", end: "2026-11-20T16:00:00.000Z" })
  })
  it.each([
    ["2026-03-08", "2026-03-08T05:00:00.000Z", "2026-03-09T04:00:00.000Z"],
    ["2026-11-01", "2026-11-01T04:00:00.000Z", "2026-11-02T05:00:00.000Z"],
  ])("uses the actual DST boundaries of %s", (day, start, end) => {
    expect(getDayBoundsInTimeZone(day, "America/New_York")).toEqual({ start, end })
  })
  it("handles a midnight DST jump and rejects invalid dates/zones", () => {
    expect(getDayBoundsInTimeZone("2026-09-06", "America/Santiago")).toEqual({ start: "2026-09-06T04:00:00.000Z", end: "2026-09-07T03:00:00.000Z" })
    expect(() => getDayBoundsInTimeZone("2026-02-30", "UTC")).toThrow()
    expect(() => getDayBoundsInTimeZone("2026-11-20", "invalid")).toThrow()
  })
})

describe("toISODate", () => {
  it("pads single-digit month and day", () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe("2026-01-05")
  })
})

describe("addDaysISO", () => {
  it("adds days within a month", () => {
    expect(addDaysISO("2026-08-14", 3)).toBe("2026-08-17")
  })

  it("rolls over into the next month", () => {
    expect(addDaysISO("2026-08-30", 3)).toBe("2026-09-02")
  })

  it("supports negative offsets", () => {
    expect(addDaysISO("2026-08-01", -1)).toBe("2026-07-31")
  })
})

describe("addMonthsISO", () => {
  it("adds whole months, keeping the day-of-month", () => {
    expect(addMonthsISO("2026-01-15", 1)).toBe("2026-02-15")
  })

  it("returns null when the target month has no matching day", () => {
    // Jan 31 + 1 month -> Feb has no 31st.
    expect(addMonthsISO("2026-01-31", 1)).toBeNull()
  })

  it("rolls over into the next year", () => {
    expect(addMonthsISO("2026-12-01", 1)).toBe("2027-01-01")
  })
})

describe("daysBetweenISO", () => {
  it("is positive when the second date is later", () => {
    expect(daysBetweenISO("2026-08-01", "2026-08-10")).toBe(9)
  })

  it("is negative when the second date is earlier", () => {
    expect(daysBetweenISO("2026-08-10", "2026-08-01")).toBe(-9)
  })

  it("is zero for the same date", () => {
    expect(daysBetweenISO("2026-08-14", "2026-08-14")).toBe(0)
  })
})

describe("isWeekend", () => {
  it("treats Saturday and Sunday as weekend days", () => {
    // 2026-08-15 is a Saturday, 2026-08-16 is a Sunday.
    expect(isWeekend("2026-08-15")).toBe(true)
    expect(isWeekend("2026-08-16")).toBe(true)
  })

  it("treats weekdays as non-weekend", () => {
    // 2026-08-14 is a Friday.
    expect(isWeekend("2026-08-14")).toBe(false)
  })
})
