import { execFile, type ChildProcess } from "node:child_process"
import { once } from "node:events"
import { promisify } from "node:util"

export async function stopProcessTree(child: ChildProcess): Promise<void> {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return
  const exited = once(child, "exit")
  if (process.platform === "win32") {
    await promisify(execFile)("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true })
  } else {
    // Runners launch their owned child in a new process group on POSIX.
    process.kill(-child.pid, "SIGTERM")
  }
  await exited
}
