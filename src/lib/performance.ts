import "server-only"
import { AsyncLocalStorage } from "node:async_hooks"
import { headers } from "next/headers"

const OPERATIONS = ["auth", "dashboard", "planner", "task-page", "semester", "academic-analytics", "activity-analytics"] as const
type OperationName = typeof OPERATIONS[number]
const TABLES = new Set(["profiles", "semesters", "subjects", "tasks", "task_series", "pomodoro_sessions"])
const MAX_DIAGNOSTIC_BYTES = 2 * 1024 * 1024
const benchmarkContext = new AsyncLocalStorage<string>()

function enabled() { return process.env.AKADEX_PERFORMANCE === "1" }
function elapsed(start: number) { return Math.max(0, performance.now() - start) }
function emit(record: Record<string, unknown>, requestBenchmark?: string | null) {
  const benchmark = requestBenchmark ?? benchmarkContext.getStore()
  console.info("[akadex:performance]", JSON.stringify({ ...record, ...(benchmark ? { benchmark } : {}) }))
}

async function isolatedBenchmark(): Promise<string | null> {
  if (benchmarkContext.getStore()) return benchmarkContext.getStore()!
  if (process.env.AKADEX_E2E !== "1") return null
  try {
    const value = (await headers()).get("x-akadex-benchmark")
    return value && /^bench-[a-f0-9]{32}$/.test(value) ? value : null
  } catch { return null }
}

export async function measureOperation<T>(operation: OperationName, run: () => Promise<T>): Promise<T> {
  if (!OPERATIONS.includes(operation)) throw new Error("Unknown performance operation")
  if (!enabled()) return run()
  if (!benchmarkContext.getStore() && process.env.AKADEX_E2E === "1") {
    const benchmark = await isolatedBenchmark()
    if (benchmark) {
      return benchmarkContext.run(benchmark, () => measureOperation(operation, run))
    }
  }
  const start = performance.now()
  let success = false
  try {
    const result = await run()
    success = true
    return result
  } finally {
    emit({ kind: "operation", operation, durationMs: elapsed(start), success })
  }
}

function networkOperation(input: RequestInfo | URL) {
  try {
    const path = new URL(input instanceof Request ? input.url : String(input)).pathname
    if (path.startsWith("/auth/v1/")) return "auth"
    const table = path.match(/^\/rest\/v1\/([^/]+)$/)?.[1]
    return table && TABLES.has(table) ? table : "other"
  } catch { return "other" }
}

async function payloadMetrics(response: Response, received: () => void): Promise<{ bytes: number | null; rows: number | null }> {
  if (!response.body) { received(); return { bytes: 0, rows: null } }
  const reader = response.clone().body!.getReader()
  const chunks: Uint8Array[] = []
  let bytes = 0
  try {
    while (true) {
      const next = await reader.read()
      if (next.done) break
      bytes += next.value.byteLength
      if (bytes > MAX_DIAGNOSTIC_BYTES) {
        received()
        void reader.cancel().catch(() => {})
        return { bytes: null, rows: null }
      }
      chunks.push(next.value)
    }
    received()
    const joined = new Uint8Array(bytes)
    let offset = 0
    for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.byteLength }
    let rows: number | null = null
    try {
      const value: unknown = JSON.parse(new TextDecoder().decode(joined))
      if (Array.isArray(value)) rows = value.length
    } catch { /* Non-JSON responses still have a measured byte size. */ }
    return { bytes, rows }
  } finally { reader.releaseLock() }
}

/** Diagnostics buffer at most 2 MiB of a clone, never the caller's response. */
export function createMeasuredFetch(network: typeof fetch = globalThis.fetch): typeof fetch {
  return async (input, init) => {
    if (!enabled()) return network(input, init)
    const benchmark = await isolatedBenchmark()
    const operation = networkOperation(input)
    const start = performance.now()
    let response: Response
    try { response = await network(input, init) } catch (error) {
      emit({ kind: "network", operation, durationMs: elapsed(start), status: null, success: false, bytes: null, rows: null }, benchmark)
      throw error
    }
    let metrics: { bytes: number | null; rows: number | null } = { bytes: null, rows: null }
    let durationMs = elapsed(start)
    try { metrics = await payloadMetrics(response, () => { durationMs = elapsed(start) }) } catch { /* Diagnostics never replace a usable response. */ }
    emit({ kind: "network", operation, durationMs, status: response.status, success: response.ok, ...metrics }, benchmark)
    return response
  }
}
