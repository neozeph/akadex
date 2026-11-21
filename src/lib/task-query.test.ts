import { afterEach, expect, it, vi } from "vitest"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { parseTaskQuery, taskPageHref } from "./task-query"
import { queryTaskPage } from "./task-query-server"
import empty from "@/app/(dashboard)/dashboard/fixtures/empty-response.json"
import failure from "@/app/(dashboard)/dashboard/fixtures/service-failure.json"
import capturedTasks from "../../docs/specs/results/fixtures/06-task-query-rows.json"

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks() })
it("uses one extra captured row for lookahead while exposing fifty normalized tasks", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-test-key")
  const rows = Array.from({ length:51 }, (_, index) => ({ ...capturedTasks[0], id:`00000000-0000-4000-8000-${String(index).padStart(12,"0")}` }))
  vi.stubGlobal("fetch", async () => new Response(JSON.stringify(rows), { headers:empty.headers }))
  const page = await queryTaskPage(createSupabaseServerClient({getAll:()=>[]}), {q:"",status:"",subject:"",priority:""}, 1)
  expect(page.tasks.length).toBe(50)
  expect(page.hasNext).toBe(true)
  expect(page.tasks[0].subject).toEqual({ subject_code:"QUERY-A",subject_name:"Query A" })
  expect(page.tasks[0].recurrence_type).toBeNull()
})
it("fails safely instead of presenting provider failures as an empty page", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-test-key")
  vi.spyOn(console,"error").mockImplementation(()=>{})
  vi.stubGlobal("fetch", async () => new Response(failure.body, {status:failure.status,headers:failure.headers}))
  await expect(queryTaskPage(createSupabaseServerClient({getAll:()=>[]}), {q:"",status:"",subject:"",priority:""}, 1)).rejects.toThrow("Unable to load your tasks right now.")
})
it("keeps valid literal filters and safe page state", () => {
  const input = { q: '  _%,"\\ café  ', status: "in_progress", priority: "high", subject: "00000000-0000-4000-8000-000000000001", page: "2" }
  expect(parseTaskQuery(input)).toEqual({ filters: { q: '_%,"\\ café', status: "in_progress", priority: "high", subject: "00000000-0000-4000-8000-000000000001" }, page: 2, invalid: false })
})
it("rejects malformed, repeated, overlong, and unsafe values without passing them to SQL", () => {
  const parsed = parseTaskQuery({ q: ["a","b"], status: "all),user_id.not.is.null", priority: "wrong", subject: "foreign,or(x)", page: "1e20" })
  expect(parsed).toEqual({ filters: { q: "", status: "", priority: "", subject: "" }, page: 1, invalid: true })
  expect(parseTaskQuery({ q: "x".repeat(201), page: "0" }).invalid).toBe(true)
})
it("encodes links without changing literal search or carrying stale page state", () => {
  expect(taskPageHref({ q: "50% café", status: "done", priority: "", subject: "" }, 2)).toBe("/tasks?q=50%25+caf%C3%A9&status=done&page=2")
})
it("omits optional GET-RPC arguments instead of sending the string null", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-test-key")
  let url: URL | undefined
  vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
    url = new URL(String(input)); return new Response(empty.body, { headers: empty.headers })
  })
  await queryTaskPage(createSupabaseServerClient({ getAll: () => [] }), { q: "", status: "", subject: "", priority: "" }, 1)
  expect(url?.searchParams.has("p_status")).toBe(false)
  expect(url?.searchParams.has("p_subject")).toBe(false)
  expect(url?.searchParams.has("p_priority")).toBe(false)
})
it("sends SQL search arguments and a bounded deterministic second page through the real client", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-test-key")
  let requested: URL | undefined
  vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
    requested = new URL(input instanceof Request ? input.url : String(input))
    return new Response(empty.body, { status: empty.status, headers: empty.headers })
  })
  const supabase = createSupabaseServerClient({ getAll: () => [] })
  await queryTaskPage(supabase, { q: '_%,"\\ café', status: "done", priority: "high", subject: "00000000-0000-4000-8000-000000000001" }, 2)
  expect(requested?.pathname).toBe("/rest/v1/rpc/search_tasks")
  expect(requested?.searchParams.get("p_search")).toBe('_%,"\\ café')
  expect(requested?.searchParams.get("p_status")).toBe("done")
  expect(requested?.searchParams.get("p_priority")).toBe("high")
  expect(requested?.searchParams.get("p_subject")).toBe("00000000-0000-4000-8000-000000000001")
  expect(requested?.searchParams.get("order")).toBe("due_date.asc.nullslast,created_at.desc,id.asc")
  expect(requested?.searchParams.get("offset")).toBe("50")
  expect(requested?.searchParams.get("limit")).toBe("51")
})
