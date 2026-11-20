import { afterEach, describe, expect, it, vi } from "vitest"
import { createMeasuredFetch, measureOperation } from "./performance"
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-akadex-benchmark": "bench-0123456789abcdef0123456789abcdef" }) }))

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks() })

describe("opt-in performance measurements", () => {
  it("correlates only local E2E operation and network spans using an opaque benchmark token", async () => {
    vi.stubEnv("AKADEX_PERFORMANCE", "1")
    vi.stubEnv("AKADEX_E2E", "1")
    const log = vi.spyOn(console, "info").mockImplementation(() => {})
    await measureOperation("dashboard", async () => {
      await createMeasuredFetch(async () => new Response("[]"))("http://127.0.0.1:54321/rest/v1/tasks")
    })
    const records = log.mock.calls.map((call) => JSON.parse(call[1]))
    expect(records).toHaveLength(2)
    expect(records.every((record) => record.benchmark === "bench-0123456789abcdef0123456789abcdef")).toBe(true)
  })
  it("emits one parseable JSON record per measurement", async () => {
    vi.stubEnv("AKADEX_PERFORMANCE", "1")
    const log = vi.spyOn(console, "info").mockImplementation(() => {})
    await measureOperation("dashboard", async () => 1)
    expect(() => JSON.parse(log.mock.calls[0][1])).not.toThrow()
  })
  it("preserves results and remains silent by default", async () => {
    vi.stubEnv("AKADEX_PERFORMANCE", "")
    const log = vi.spyOn(console, "info").mockImplementation(() => {})
    const value = { sensitive: "PRIVATE" }
    expect(await measureOperation("dashboard", async () => value)).toBe(value)
    expect(log).not.toHaveBeenCalled()
  })

  it("reports independently timed concurrent operations without their values", async () => {
    vi.stubEnv("AKADEX_PERFORMANCE", "1")
    const log = vi.spyOn(console, "info").mockImplementation(() => {})
    vi.spyOn(performance, "now").mockReturnValueOnce(10).mockReturnValueOnce(20).mockReturnValueOnce(35).mockReturnValueOnce(50)
    await Promise.all([
      measureOperation("dashboard", async () => "PRIVATE"),
      measureOperation("planner", async () => "PRIVATE"),
    ])
    expect(log.mock.calls.map((call) => JSON.parse(call[1]))).toEqual([
      { kind: "operation", operation: "dashboard", durationMs: 25, success: true },
      { kind: "operation", operation: "planner", durationMs: 30, success: true },
    ])
    expect(JSON.stringify(log.mock.calls)).not.toContain("PRIVATE")
  })

  it("rethrows the original failure and logs no error contents", async () => {
    vi.stubEnv("AKADEX_PERFORMANCE", "1")
    const log = vi.spyOn(console, "info").mockImplementation(() => {})
    const error = new Error("PRIVATE TOKEN")
    await expect(measureOperation("auth", async () => { throw error })).rejects.toBe(error)
    expect(JSON.parse(log.mock.calls[0][1])).toMatchObject({ operation: "auth", success: false })
    expect(JSON.stringify(log.mock.calls)).not.toContain("PRIVATE")
  })

  it("rejects non-allowlisted labels at runtime", async () => {
    vi.stubEnv("AKADEX_PERFORMANCE", "1")
    const log = vi.spyOn(console, "info").mockImplementation(() => {})
    await expect(measureOperation("user-secret" as "auth", async () => 1)).rejects.toThrow()
    expect(log).not.toHaveBeenCalled()
  })
})

describe("Supabase network measurements", () => {
  it("correlates server-action database calls outside a measured loader", async () => {
    vi.stubEnv("AKADEX_PERFORMANCE", "1")
    vi.stubEnv("AKADEX_E2E", "1")
    const log = vi.spyOn(console, "info").mockImplementation(() => {})
    await createMeasuredFetch(async () => new Response("[]"))("http://127.0.0.1:54321/rest/v1/tasks")
    expect(JSON.parse(log.mock.calls[0][1]).benchmark).toBe("bench-0123456789abcdef0123456789abcdef")
  })
  it("passes through options and leaves the response readable without leaking request or payload data", async () => {
    vi.stubEnv("AKADEX_PERFORMANCE", "1")
    const log = vi.spyOn(console, "info").mockImplementation(() => {})
    // Adversarial input, not a captured Supabase fixture or integration claim.
    const payload = '[{"id":"PRIVATE","title":"秘密"}]'
    const response = new Response(payload, { status: 200 })
    let received: RequestInit | undefined
    const network: typeof fetch = async (_input, init) => { received = init; return response }
    const options = { signal: new AbortController().signal, headers: { Authorization: "PRIVATE" } }
    const result = await createMeasuredFetch(network)("http://127.0.0.1:54321/rest/v1/tasks?user_id=eq.PRIVATE", options)
    expect(received).toBe(options)
    expect(result).toBe(response)
    expect(await result.text()).toBe(payload)
    expect(JSON.parse(log.mock.calls[0][1])).toMatchObject({ kind: "network", operation: "tasks", status: 200, success: true, rows: 1, bytes: 35 })
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/PRIVATE|秘密|Authorization|user_id/)
  })

  it("records failed HTTP responses as failures, not successful timings", async () => {
    vi.stubEnv("AKADEX_PERFORMANCE", "1")
    const log = vi.spyOn(console, "info").mockImplementation(() => {})
    const network: typeof fetch = async () => new Response(null, { status: 503 })
    const response = await createMeasuredFetch(network)(new Request("http://127.0.0.1:54321/auth/v1/user"))
    expect(response.status).toBe(503)
    expect(JSON.parse(log.mock.calls[0][1])).toMatchObject({ operation: "auth", status: 503, success: false, bytes: 0, rows: null })
  })

  it("does not swallow abort/network errors", async () => {
    vi.stubEnv("AKADEX_PERFORMANCE", "1")
    const log = vi.spyOn(console, "info").mockImplementation(() => {})
    const error = new DOMException("PRIVATE", "AbortError")
    const network: typeof fetch = async () => { throw error }
    await expect(createMeasuredFetch(network)("http://127.0.0.1:54321/rest/v1/tasks")).rejects.toBe(error)
    expect(JSON.parse(log.mock.calls[0][1])).toMatchObject({ kind: "network", success: false, status: null })
    expect(JSON.stringify(log.mock.calls)).not.toContain("PRIVATE")
  })

  it("does not consume or measure responses when disabled", async () => {
    vi.stubEnv("AKADEX_PERFORMANCE", "0")
    const log = vi.spyOn(console, "info").mockImplementation(() => {})
    const response = new Response("not JSON")
    const network: typeof fetch = async () => response
    expect(await createMeasuredFetch(network)("http://localhost/private")).toBe(response)
    expect(response.bodyUsed).toBe(false)
    expect(log).not.toHaveBeenCalled()
  })
})
