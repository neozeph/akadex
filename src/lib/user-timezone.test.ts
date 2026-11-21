import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { getUserTimeZone } from "./user-timezone"

vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [] }) }))
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-test-key")
  vi.spyOn(console, "error").mockImplementation(() => {})
})
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks() })

it("uses the explicit default when the authenticated account has no profile", async () => {
  vi.stubGlobal("fetch", async () => new Response("[]", { headers: { "content-type": "application/json" } }))
  expect(await getUserTimeZone("00000000-0000-4000-8000-000000000001")).toBe("Asia/Manila")
})
it("does not disguise a profile read failure as the default timezone", async () => {
  vi.stubGlobal("fetch", async () => new Response('{"code":"42501","message":"permission denied"}', { status: 403, headers: { "content-type": "application/json" } }))
  await expect(getUserTimeZone("00000000-0000-4000-8000-000000000001")).rejects.toThrow("Unable to load your calendar preferences.")
})
