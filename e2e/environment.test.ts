import { describe, expect, it } from "vitest"
import { assertLocalE2EEnvironment, assertMatchingBuildTarget } from "./environment"

describe("isolated E2E destination", () => {
  it("accepts the dedicated loopback app and Supabase", () => {
    expect(() => assertLocalE2EEnvironment("http://127.0.0.1:3100", "http://127.0.0.1:54321")).not.toThrow()
  })

  it.each([
    ["https://akadex.vercel.app", "http://127.0.0.1:54321"],
    ["http://127.0.0.1:3100", "https://example.supabase.co"],
    ["http://127.0.0.1.example.com:3100", "http://127.0.0.1:54321"],
    ["http://localhost@evil.example:3100", "http://127.0.0.1:54321"],
    ["http://user:password@127.0.0.1:3100", "http://127.0.0.1:54321"],
    ["http://127.0.0.1:3000", "http://127.0.0.1:54321"],
    ["http://127.0.0.1:3100", "http://127.0.0.1:54321/remote"],
    ["http://127.0.0.1:3100?target=production", "http://127.0.0.1:54321"],
    ["", ""],
  ])("rejects unsafe or unintended destinations (%s)", (app, database) => {
    expect(() => assertLocalE2EEnvironment(app, database)).toThrow()
  })

  it("rejects a build using a different backend, app, or public key", () => {
    const build = { appUrl: "http://127.0.0.1:3100", supabaseUrl: "http://127.0.0.1:54321", keyFingerprint: "local-key" }
    expect(() => assertMatchingBuildTarget(build, build)).not.toThrow()
    for (const change of [{ supabaseUrl: "https://example.supabase.co" }, { appUrl: "http://127.0.0.1:3000" }, { keyFingerprint: "changed" }]) {
      expect(() => assertMatchingBuildTarget(build, { ...build, ...change })).toThrow()
    }
  })
})
