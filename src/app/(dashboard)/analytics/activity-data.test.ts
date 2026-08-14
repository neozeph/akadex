import { describe, expect, it } from "vitest"
import { buildDailyBuckets, buildMonthlyBuckets, DEFAULT_ANALYTICS_RANGE, parseAnalyticsRange } from "./activity-data"

describe("parseAnalyticsRange", () => {
  it("accepts each valid range value", () => {
    expect(parseAnalyticsRange("7d")).toBe("7d")
    expect(parseAnalyticsRange("30d")).toBe("30d")
    expect(parseAnalyticsRange("all")).toBe("all")
  })

  it("falls back to the default for an invalid value", () => {
    expect(parseAnalyticsRange("90d")).toBe(DEFAULT_ANALYTICS_RANGE)
    expect(parseAnalyticsRange("")).toBe(DEFAULT_ANALYTICS_RANGE)
  })

  it("falls back to the default when missing", () => {
    expect(parseAnalyticsRange(undefined)).toBe(DEFAULT_ANALYTICS_RANGE)
  })
})

describe("buildDailyBuckets", () => {
  it("produces one bucket per calendar day in the range, inclusive", () => {
    const buckets = buildDailyBuckets([], "2026-08-10", "2026-08-14")
    expect(buckets.map((bucket) => bucket.key)).toEqual([
      "2026-08-10",
      "2026-08-11",
      "2026-08-12",
      "2026-08-13",
      "2026-08-14",
    ])
  })

  it("zero-fills days with no matching entries instead of omitting them", () => {
    const buckets = buildDailyBuckets(
      [{ dateISO: "2026-08-12", value: 3 }],
      "2026-08-10",
      "2026-08-14",
    )
    expect(buckets.map((bucket) => bucket.value)).toEqual([0, 0, 3, 0, 0])
  })

  it("sums multiple entries that land on the same day", () => {
    const buckets = buildDailyBuckets(
      [
        { dateISO: "2026-08-12", value: 2 },
        { dateISO: "2026-08-12", value: 1 },
      ],
      "2026-08-12",
      "2026-08-12",
    )
    expect(buckets).toEqual([{ key: "2026-08-12", label: "AUG 12", value: 3 }])
  })

  it("handles a range spanning a month boundary", () => {
    const buckets = buildDailyBuckets([], "2026-08-30", "2026-09-02")
    expect(buckets.map((bucket) => bucket.key)).toEqual([
      "2026-08-30",
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
    ])
  })
})

describe("buildMonthlyBuckets", () => {
  it("produces one bucket per calendar month in the range, inclusive", () => {
    const buckets = buildMonthlyBuckets([], "2026-01-15", "2026-04-02")
    expect(buckets.map((bucket) => bucket.key)).toEqual(["2026-01", "2026-02", "2026-03", "2026-04"])
  })

  it("handles a range spanning a year boundary", () => {
    const buckets = buildMonthlyBuckets([], "2025-11-20", "2026-01-05")
    expect(buckets.map((bucket) => bucket.key)).toEqual(["2025-11", "2025-12", "2026-01"])
  })

  it("aggregates entries by month regardless of day-of-month", () => {
    const buckets = buildMonthlyBuckets(
      [
        { dateISO: "2026-01-03", value: 5 },
        { dateISO: "2026-01-28", value: 4 },
        { dateISO: "2026-02-14", value: 1 },
      ],
      "2026-01-01",
      "2026-02-28",
    )
    expect(buckets).toEqual([
      { key: "2026-01", label: "JAN 2026", value: 9 },
      { key: "2026-02", label: "FEB 2026", value: 1 },
    ])
  })

  it("single-month range still produces exactly one bucket", () => {
    const buckets = buildMonthlyBuckets([], "2026-08-01", "2026-08-31")
    expect(buckets.map((bucket) => bucket.key)).toEqual(["2026-08"])
  })
})
