import { spawn } from "node:child_process"
import { once } from "node:events"
import { expect, it } from "vitest"
import { stopProcessTree } from "./process"

it("stops the owned server process and its descendants", async () => {
  const source = `const {spawn}=require('node:child_process'); const c=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'}); console.log(c.pid); setInterval(()=>{},1000);`
  const parent = spawn(process.execPath, ["-e", source], { detached: process.platform !== "win32", stdio: ["ignore", "pipe", "ignore"] })
  const [chunk] = await once(parent.stdout!, "data")
  const descendant = Number(String(chunk).trim())
  try {
    await stopProcessTree(parent)
    expect(() => process.kill(descendant, 0)).toThrow()
    expect(parent.exitCode !== null || parent.signalCode !== null).toBe(true)
  } finally {
    if (parent.exitCode === null && parent.signalCode === null) parent.kill()
    try { process.kill(descendant) } catch { /* Already gone. */ }
  }
}, 15_000)
