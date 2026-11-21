import { spawn } from "node:child_process"
import { once } from "node:events"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { createServer } from "node:net"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { expect, it } from "vitest"
import { stopProcessTree } from "./process"

it.skipIf(process.platform === "win32")("Playwright finishes and stops a detached server on Linux", async () => {
  const directory = await mkdtemp(join(tmpdir(), "akadex-shutdown-"))
  const portProbe = createServer().listen(0, "127.0.0.1")
  await once(portProbe, "listening")
  const port = (portProbe.address() as { port: number }).port
  await new Promise<void>((done) => portProbe.close(() => done()))
  const url = `http://127.0.0.1:${port}`
  const pidFile = join(directory, "server.pid")
  const wrapper = join(directory, "server.mjs")
  // Match run.ts: a detached child inherits the wrapper's output pipes.
  await writeFile(wrapper, `
    import { spawn } from 'node:child_process';
    import { writeFileSync } from 'node:fs';
    import { stopProcessTree } from ${JSON.stringify(pathToFileURL(resolve("e2e/process.ts")).href)};
    const child = spawn(process.execPath, ['-e', ${JSON.stringify(`require('node:http').createServer((req,res)=>res.end('ready')).listen(${port}, '127.0.0.1')`)}], { detached: true, stdio: 'inherit' });
    writeFileSync(${JSON.stringify(pidFile)}, String(child.pid));
    process.once('SIGTERM', () => { void stopProcessTree(child); });
  `)
  await writeFile(join(directory, "probe.spec.ts"), `
    import { test, expect } from ${JSON.stringify(resolve("node_modules/@playwright/test/index.mjs"))};
    test('server is ready', async ({ request }) => { expect((await request.get(${JSON.stringify(url)})).ok()).toBe(true); });
  `)
  const config = join(directory, "playwright.config.mjs")
  await writeFile(config, `
    import loaded from ${JSON.stringify(pathToFileURL(resolve("playwright.config.ts")).href)};
    const base = loaded.default ?? loaded;
    export default { ...base, testDir: ${JSON.stringify(directory)}, testMatch: 'probe.spec.ts', outputDir: ${JSON.stringify(join(directory, "results"))}, webServer: { ...base.webServer, command: ${JSON.stringify(`"${process.execPath}" "${wrapper}"`)}, url: ${JSON.stringify(url)} } };
  `)
  const runner = spawn(process.execPath, [resolve("node_modules/@playwright/test/cli.js"), "test", "--config", config], {
    detached: true, stdio: ["ignore", "pipe", "pipe"],
  })
  let output = ""
  runner.stdout.on("data", (chunk) => { output += chunk })
  runner.stderr.on("data", (chunk) => { output += chunk })
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const finished = await Promise.race([
      once(runner, "close").then(([code]) => ({ code, timedOut: false })),
      new Promise<{ code: null; timedOut: boolean }>((done) => {
        timer = setTimeout(() => done({ code: null, timedOut: true }), 15_000)
      }),
    ])
    expect(finished, output).toEqual({ code: 0, timedOut: false })
    expect(output).toContain("1 passed")
    await expect(fetch(url, { signal: AbortSignal.timeout(1000) })).rejects.toThrow()
  } finally {
    clearTimeout(timer)
    await stopProcessTree(runner)
    // The deliberately failing version leaves this detached child behind.
    try { process.kill(Number(await readFile(pidFile, "utf8")), "SIGKILL") } catch { /* Already stopped. */ }
    await rm(directory, { recursive: true, force: true })
  }
}, 25_000)
