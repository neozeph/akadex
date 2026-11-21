import { chromium } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { spawn } from "node:child_process"
import { resolve } from "node:path"
import { E2E_APP_URL } from "./environment.ts"
import { localRuntime } from "./runtime.ts"
import { stopProcessTree } from "./process.ts"

const { env } = localRuntime()
// Never attach to an arbitrary process already listening on the test port.
try { await fetch(`${E2E_APP_URL}/login`); throw new Error("port occupied") } catch (error) {
  if (error instanceof Error && error.message === "port occupied") throw new Error("Port 3100 is occupied. Stop that app before manual setup.")
}
const server = spawn(process.execPath, [resolve("e2e/run.ts"), "serve"], { env, detached: process.platform !== "win32", stdio: "inherit" })
let serverExited = false
server.once("exit", () => { serverExited = true })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  const deadline = Date.now() + 180_000
  let ready = false
  while (Date.now() < deadline && !serverExited) {
    try { ready = (await fetch(`${E2E_APP_URL}/login`)).ok } catch { /* Wait for the actual local build. */ }
    if (ready) break
    await new Promise((done) => setTimeout(done, 500))
  }
  if (!ready) throw new Error("Isolated server did not become ready.")
  await mkdir("e2e/.auth", { recursive: true })
  browser = await chromium.launch({ headless: false })
  for (const account of ["a", "b"]) {
    const context = await browser.newContext()
    const page = await context.newPage()
    console.info(`Manually create or sign in to disposable local account ${account.toUpperCase()} in this browser. Use different accounts. No credentials are read by this script.`)
    await page.goto(`${E2E_APP_URL}/register`)
    await page.waitForURL(`${E2E_APP_URL}/dashboard`, { timeout: 0 })
    await page.getByRole("heading", { level: 1 }).waitFor()
    await context.storageState({ path: `e2e/.auth/${account}.json` })
    await context.close()
    console.info(`Account ${account.toUpperCase()} local browser state saved privately.`)
  }
} finally {
  await browser?.close()
  await stopProcessTree(server)
}
