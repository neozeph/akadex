import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { expect, it } from "vitest"
import { buildFingerprint } from "./build"

it("invalidates a reusable build when compiled source changes, without hashing session files", async () => {
  const root = await mkdtemp(join(tmpdir(), "akadex-build-"))
  try {
    await mkdir(join(root, "src"))
    await mkdir(join(root, "e2e/.auth"), { recursive: true })
    for (const file of ["next.config.ts", "tsconfig.json", "package-lock.json"]) await writeFile(join(root, file), "initial")
    await writeFile(join(root, "src/page.tsx"), "initial")
    const first = await buildFingerprint(root)
    await writeFile(join(root, "e2e/.auth/private.json"), "DO NOT READ")
    expect(await buildFingerprint(root)).toBe(first)
    await writeFile(join(root, "src/page.tsx"), "changed")
    expect(await buildFingerprint(root)).not.toBe(first)
  } finally {
    if (dirname(resolve(root)) !== resolve(tmpdir()) || !root.includes("akadex-build-")) throw new Error("Unsafe temporary cleanup path")
    await rm(root, { recursive: true, force: true })
  }
})
