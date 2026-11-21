import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { localRuntime } from "./runtime.ts"

export function localSQL(query: string, database = "postgres") {
  if (database !== "postgres" && !/^akadex_migration_[a-f0-9]{12}$/.test(database)) throw new Error("Invalid verification database")
  return execFileSync("docker", ["exec", "-i", "supabase_db_akadex-e2e", "psql", "-U", "postgres", "-d", database, "-v", "ON_ERROR_STOP=1", "-At"], { input: query, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim()
}

function cli(args: string[]) {
  execFileSync(process.execPath, [resolve("node_modules/supabase/dist/supabase.js"), ...args], { stdio: ["ignore", "pipe", "pipe"] })
}

export async function adoptLocalBaseline() {
  localRuntime() // Exact local origins and dedicated project; never a hosted fallback.
  const baseline = JSON.parse(await readFile("supabase/baseline.json", "utf8"))
  const dump = execFileSync("docker", ["exec", "supabase_db_akadex-e2e", "pg_dump", "-U", "postgres", "--schema-only", "--schema=public", "--no-owner", "--no-privileges", "postgres"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
  const normalized = dump.split(/\r?\n/).filter((line) => !/^\\(un)?restrict /.test(line) && !/^-- Dumped /.test(line)).join("\n")
  if (createHash("sha256").update(normalized).digest("hex") !== baseline.publicSchemaSha256) throw new Error("Schema differs from the captured spec04 baseline; adoption refused.")
  cli(["migration", "repair", "--local", "--status", "applied", baseline.version, ...baseline.includes])
}

export async function applyLocalMigrations() {
  localRuntime()
  const hasLedger = localSQL("SELECT to_regclass('supabase_migrations.schema_migrations') IS NOT NULL") === "t"
  if (!hasLedger || localSQL("SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version = '20261120000000'") !== "1") throw new Error("Existing database needs explicit baseline adoption; run npm run e2e:adopt-baseline after reviewing supabase/baseline.json.")
  cli(["db", "push", "--local", "--yes"])
}
