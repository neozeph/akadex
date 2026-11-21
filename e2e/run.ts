import { spawn } from "node:child_process"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { appendFileSync } from "node:fs"
import { assertLocalE2EEnvironment, assertMatchingBuildTarget, E2E_APP_URL, E2E_SUPABASE_URL } from "./environment.ts"
import { localRuntime } from "./runtime.ts"
import { stopProcessTree } from "./process.ts"
import { buildFingerprint } from "./build.ts"
import { execFileSync } from "node:child_process"
import { adoptLocalBaseline, applyLocalMigrations } from "./migrations.ts"

async function main() {
  const mode = process.argv[2]
  if (Number(process.versions.node.split(".")[0]) < 24) throw new Error("E2E requires Node.js 24 or newer.")
  if (!["db", "adopt-baseline", "serve", "setup", "test", "baseline"].includes(mode)) throw new Error("Unknown isolated E2E command.")
  if (mode === "adopt-baseline") {
    await adoptLocalBaseline()
    console.info("Verified local baseline registered. No schema or rows were replayed.")
    return
  }
  if (mode === "db") {
    assertLocalE2EEnvironment(process.env.E2E_APP_URL ?? E2E_APP_URL, process.env.E2E_SUPABASE_URL ?? E2E_SUPABASE_URL)
    execFileSync(process.execPath, [resolve("node_modules/supabase/dist/supabase.js"), "start", "--exclude", "realtime,storage-api,imgproxy,studio,edge-runtime,logflare,vector,supavisor"], { stdio: ["ignore", "pipe", "pipe"], maxBuffer: 20 * 1024 * 1024 })
    localRuntime()
    await applyLocalMigrations()
    console.info("Dedicated local Supabase is ready. CLI credentials were not printed.")
    return
  }
  const { target, env } = localRuntime()
  delete env.NO_COLOR
  env.PLAYWRIGHT_NO_COPY_PROMPT = "1"
  const execute = (file: string, args: string[], childEnv = env) => new Promise<void>((done, reject) => {
    const collect = mode === "serve" && args[0] === "start"
    const child = spawn(process.execPath, [file, ...args], { env: childEnv, detached: process.platform !== "win32", stdio: collect ? ["inherit", "pipe", "inherit"] : "inherit" })
    if (collect) {
      let pending = ""
      child.stdout!.on("data", (chunk) => {
        pending += String(chunk)
        const lines = pending.split(/\r?\n/)
        pending = lines.pop() ?? ""
        for (const line of lines) {
          const match = line.match(/\[akadex:performance\] (\{.*\})$/)
          if (match) {
            const metric: unknown = JSON.parse(match[1])
            appendFileSync("e2e/.cache/metrics.ndjson", JSON.stringify({ at: Date.now(), metric }) + "\n")
          } else process.stdout.write(line + "\n")
        }
      })
    }
    const terminate = () => { void stopProcessTree(child).catch(() => {}) }
    process.once("SIGINT", terminate)
    process.once("SIGTERM", terminate)
    child.once("error", reject)
    child.once("exit", (code) => {
      process.removeListener("SIGINT", terminate)
      process.removeListener("SIGTERM", terminate)
      if (code === 0) done()
      else reject(new Error("Isolated child process failed. See its preceding diagnostics."))
    })
  })
  if (mode === "serve") {
    await mkdir("e2e/.cache", { recursive: true })
    await writeFile("e2e/.cache/metrics.ndjson", "")
    const source = await buildFingerprint()
    let reusable = false
    try {
      const saved = JSON.parse(await readFile("e2e/.cache/build-target.json", "utf8"))
      assertMatchingBuildTarget(saved, target)
      reusable = saved.source === source && saved.build === (await readFile(".next-e2e/BUILD_ID", "utf8")).trim()
    } catch { /* Missing, different, or incomplete builds must be rebuilt. */ }
    if (!reusable) {
      await execute(resolve("node_modules/next/dist/bin/next"), ["build"])
      await writeFile("e2e/.cache/build-target.json", JSON.stringify({ ...target, source: await buildFingerprint(), build: (await readFile(".next-e2e/BUILD_ID", "utf8")).trim() }))
    }
    const manifest = JSON.parse(await readFile("e2e/.cache/build-target.json", "utf8"))
    assertMatchingBuildTarget(manifest, localRuntime().target)
    await execute(resolve("node_modules/next/dist/bin/next"), ["start", "--hostname", "127.0.0.1", "--port", "3100"])
  } else if (mode === "setup") {
    await execute(resolve("e2e/setup.ts"), [])
  } else {
    await execute(resolve("node_modules/@playwright/test/cli.js"), ["test", "--project", "chromium", ...(mode === "baseline" ? ["--grep", "story 2"] : ["--grep-invert", "story 2"])], { ...env, AKADEX_PERFORMANCE: process.env.AKADEX_PERFORMANCE ?? "1" })
  }
}

main().catch(() => {
  // Do not serialize child errors: some contain raw CLI status or credentials.
  console.error("Isolated E2E command failed. Check local Supabase, browser setup, and preceding safe diagnostics.")
  process.exitCode = 1
})
