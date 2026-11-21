import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import empty from "./fixtures/empty-response.json"
import count from "./fixtures/empty-count.json"
import failure from "./fixtures/service-failure.json"
import { getDashboardData } from "./data"
import { getPomodoroPageData } from "../pomodoro/data"

vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [] }) }))

type Query = "semesters" | "subjects" | "pending" | "completed" | "upcoming" | "focus"

function useCapturedNetwork(failed?: Query, invalid?: { query: Query; kind: "missing-count" | "missing-endpoint" | "null-data" }) {
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input))
    const head = init?.method === "HEAD"
    if (url.pathname.endsWith("/profiles")) return new Response('{"timezone":"Asia/Manila"}', { headers: { "content-type": "application/json" } })
    const query: Query = url.pathname.endsWith("/semesters") ? "semesters"
      : url.pathname.endsWith("/subjects") ? "subjects"
      : (url.pathname.endsWith("/pomodoro_sessions") || url.pathname.endsWith("/focus_summary")) ? "focus"
      : !head ? "upcoming" : url.searchParams.get("status") === "eq.done" ? "completed" : "pending"
    const captured = query === failed ? failure : head ? count : empty
    if (query === invalid?.query) {
      return new Response(invalid.kind === "null-data" ? "null" : null, {
        status: invalid.kind === "missing-endpoint" ? 404 : 200,
        headers: { "content-type": "application/json" },
      })
    }
    return new Response(head ? null : query === "focus" && url.pathname.endsWith("/focus_summary") && query !== failed ? JSON.stringify({count:0,seconds:0}) : captured.body, { status: captured.status, headers: captured.headers })
  })
}

beforeEach(() => {
  vi.stubEnv("AKADEX_PERFORMANCE", "0")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-test-key")
  vi.spyOn(console, "error").mockImplementation(() => {})
})
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks() })

describe("dashboard query outcomes through the real Supabase client", () => {
  it.each([["dashboard", getDashboardData], ["pomodoro", getPomodoroPageData]] as const)("%s queries the user's completion day with one profile read", async (_name, load) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-11-19T16:00:00Z"))
    try {
      useCapturedNetwork()
      const original = globalThis.fetch
      let focus: URL | undefined
      let focusBody: Record<string,string> | undefined
      let profileReads = 0
      vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(input instanceof Request ? input.url : String(input))
        if (url.pathname.endsWith("/pomodoro_sessions")) focus = url
        if (url.pathname.endsWith("/focus_summary")) {focus=url;focusBody=JSON.parse(String(init?.body))}
        if (url.pathname.endsWith("/profiles")) profileReads++
        return original(input, init)
      })
      await load("00000000-0000-4000-8000-000000000001")
      if (_name === "dashboard") {
        expect(focus?.pathname).toBe("/rest/v1/rpc/focus_summary")
        expect(focusBody).toEqual({p_start:"2026-11-19T16:00:00.000Z",p_end:"2026-11-20T16:00:00.000Z"})
      } else expect(focus?.searchParams.getAll("ended_at")).toEqual(["gte.2026-11-19T16:00:00.000Z", "lt.2026-11-20T16:00:00.000Z"])
      expect(focus?.searchParams.has("created_at")).toBe(false)
      expect(profileReads).toBe(1)
    } finally { vi.useRealTimers() }
  })
  it("rejects an empty HEAD 404 even when the SDK normalizes it to error-free 204", async () => {
    useCapturedNetwork(undefined, { query: "semesters", kind: "missing-endpoint" })
    await expect(getDashboardData("00000000-0000-4000-8000-000000000001")).rejects.toThrow("Unable to load your dashboard right now.")
  })

  it.each<Query>(["semesters", "pending", "completed"])("rejects an unknown %s count instead of inventing zero", async (query) => {
    useCapturedNetwork(undefined, { query, kind: "missing-count" })
    await expect(getDashboardData("00000000-0000-4000-8000-000000000001")).rejects.toThrow("Unable to load your dashboard right now.")
  })

  it.each<Query>(["subjects", "upcoming", "focus"])("rejects missing %s rows instead of inventing an empty list", async (query) => {
    useCapturedNetwork(undefined, { query, kind: "null-data" })
    await expect(getDashboardData("00000000-0000-4000-8000-000000000001")).rejects.toThrow("Unable to load your dashboard right now.")
  })
  it("preserves real empty results rather than treating zeroes as failures", async () => {
    useCapturedNetwork()
    expect(await getDashboardData("00000000-0000-4000-8000-000000000001")).toEqual({
      overallGpa: null, totalUnitsCompleted: 0, semesterCount: 0,
      pendingTaskCount: 0, completedTaskCount: 0,
      pomodoroSessionsToday: 0, focusMinutesToday: 0, upcomingTasks: [],
    })
  })

  it.each<Query>(["semesters", "subjects", "pending", "completed", "upcoming", "focus"])("rejects the whole dashboard safely when %s fails", async (query) => {
    useCapturedNetwork(query)
    await expect(getDashboardData("00000000-0000-4000-8000-000000000001")).rejects.toThrow("Unable to load your dashboard right now.")
  })

  it("does not expose provider text or retain failure state after recovery", async () => {
    useCapturedNetwork("subjects")
    let publicMessage = ""
    try { await getDashboardData("00000000-0000-4000-8000-000000000001") } catch (error) { publicMessage = (error as Error).message }
    expect(publicMessage).toBe("Unable to load your dashboard right now.")
    expect(publicMessage).not.toMatch(/permission denied|42501|subjects/)
    useCapturedNetwork()
    expect((await getDashboardData("00000000-0000-4000-8000-000000000001")).semesterCount).toBe(0)
  })
})
