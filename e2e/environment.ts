export const E2E_APP_URL = "http://127.0.0.1:3100"
export const E2E_SUPABASE_URL = "http://127.0.0.1:54321"

export type BuildTarget = { appUrl: string; supabaseUrl: string; keyFingerprint: string }

export function assertLocalE2EEnvironment(appUrl: string, supabaseUrl: string): void {
  if (appUrl !== E2E_APP_URL || supabaseUrl !== E2E_SUPABASE_URL) {
    throw new Error("E2E requires the dedicated loopback app and Supabase. No remote fallback is allowed.")
  }
}

export function assertMatchingBuildTarget(build: BuildTarget, runtime: BuildTarget): void {
  assertLocalE2EEnvironment(runtime.appUrl, runtime.supabaseUrl)
  if (build.appUrl !== runtime.appUrl || build.supabaseUrl !== runtime.supabaseUrl || !build.keyFingerprint || build.keyFingerprint !== runtime.keyFingerprint) {
    throw new Error("E2E build/runtime targets differ. Rebuild using the isolated environment.")
  }
}
