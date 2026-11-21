import { describe, expect, it, vi } from "vitest"
import { buildDailyBuckets, buildMonthlyBuckets, DEFAULT_ANALYTICS_RANGE, parseAnalyticsRange, getActivityAnalyticsData } from "./activity-data"
import report from "../../../../docs/specs/results/fixtures/08-activity-report.json"

vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [] }) }))

it("uses one aggregate request for large histories and maps captured timezone buckets", async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2030-01-01T16:00:00Z"))
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-test-key")
  const calls:{path:string;body:unknown}[]=[]
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?:RequestInit) => {
    const url=new URL(input instanceof Request?input.url:String(input))
    if(url.pathname.endsWith("/profiles"))return Response.json({timezone:"Asia/Manila"})
    calls.push({path:url.pathname,body:init?.body?JSON.parse(String(init.body)):null})
    return Response.json(url.pathname.endsWith("/activity_report")?report:[])
  })
  try{
    const result=await getActivityAnalyticsData("00000000-0000-4000-8000-000000000001","7d")
    expect(calls).toEqual([{path:"/rest/v1/rpc/activity_report",body:{p_today:"2030-01-02",p_timezone:"Asia/Manila",p_range:"7d"}}]);expect(result.completedCount).toBe(1104)
    expect(result.activeNow).toBe(1102);expect(result.focusTimeSeconds).toBe(66060)
    expect(result.taskTrend.at(-1)).toEqual({key:"2030-01-02",label:"JAN 2",value:1104})
    expect(result.focusTrend.at(-1)?.value).toBe(1101)
  }finally{vi.useRealTimers();vi.unstubAllEnvs();vi.unstubAllGlobals()}
})

it.each([null,{...report,completedCount:null}])("rejects incomplete aggregate data rather than showing false totals",async(data)=>{
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","http://127.0.0.1:54321")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY","public-test-key")
  vi.spyOn(console,"error").mockImplementation(()=>{})
  vi.stubGlobal("fetch",async(input:RequestInfo|URL)=>Response.json(String(input).includes('/profiles')?{timezone:'Asia/Manila'}:data))
  try{await expect(getActivityAnalyticsData('00000000-0000-4000-8000-000000000001','all')).rejects.toThrow('Unable to load your analytics right now.')}
  finally{vi.unstubAllGlobals();vi.unstubAllEnvs();vi.restoreAllMocks()}
})

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
