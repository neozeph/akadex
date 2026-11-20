import { defineConfig } from "@playwright/test"
import { assertLocalE2EEnvironment, E2E_APP_URL, E2E_SUPABASE_URL } from "./e2e/environment"

// Playwright's failure context includes private page content even with traces off.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = "1"

assertLocalE2EEnvironment(process.env.E2E_APP_URL ?? E2E_APP_URL, process.env.E2E_SUPABASE_URL ?? E2E_SUPABASE_URL)

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: [["list"]],
  use: { baseURL: E2E_APP_URL, trace: "off", video: "off", screenshot: "off", viewport: { width: 1280, height: 900 } },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: "node e2e/run.ts serve",
    url: `${E2E_APP_URL}/login`,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
})
