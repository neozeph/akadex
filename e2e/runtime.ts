import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import { resolve } from "node:path"
import { assertLocalE2EEnvironment, E2E_APP_URL, E2E_SUPABASE_URL, type BuildTarget } from "./environment.ts"

export function localRuntime(): { target: BuildTarget; env: NodeJS.ProcessEnv } {
  assertLocalE2EEnvironment(process.env.E2E_APP_URL ?? E2E_APP_URL, process.env.E2E_SUPABASE_URL ?? E2E_SUPABASE_URL)
  let status: Record<string, unknown>
  try {
    // Capture output privately: status also includes administrative keys.
    status = JSON.parse(execFileSync(process.execPath, [resolve("node_modules/supabase/dist/supabase.js"), "status", "-o", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }))
  } catch { throw new Error("Local Supabase is unavailable. Run npm run e2e:db. No remote fallback.") }
  const url = status.API_URL
  const key = status.PUBLISHABLE_KEY ?? status.ANON_KEY
  if (typeof url !== "string" || typeof key !== "string" || !key) throw new Error("Local Supabase did not return public API configuration.")
  assertLocalE2EEnvironment(E2E_APP_URL, url)
  return {
    target: { appUrl: E2E_APP_URL, supabaseUrl: E2E_SUPABASE_URL, keyFingerprint: createHash("sha256").update(key).digest("hex") },
    env: { ...process.env, AKADEX_E2E: "1", NEXT_PUBLIC_APP_URL: E2E_APP_URL, NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key },
  }
}
