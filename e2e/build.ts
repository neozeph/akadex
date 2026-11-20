import { createHash } from "node:crypto"
import { readFile, readdir } from "node:fs/promises"
import { join } from "node:path"

export async function buildFingerprint(root = process.cwd()): Promise<string> {
  const hash = createHash("sha256")
  const files = ["next.config.ts", "tsconfig.json", "package-lock.json"]
  async function visit(directory: string) {
    for (const entry of await readdir(join(root, directory), { withFileTypes: true })) {
      const file = `${directory}/${entry.name}`
      if (entry.isDirectory()) await visit(file)
      else if (entry.isFile()) files.push(file)
    }
  }
  await visit("src")
  for (const file of files.sort()) { hash.update(file); hash.update(await readFile(join(root, file))) }
  return hash.digest("hex")
}
