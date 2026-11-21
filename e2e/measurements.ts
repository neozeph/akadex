export type Sample = { durationMs: number; success: boolean; failureStage?: "action" | "verification"; assertion?: string }

export async function recordSample(action: () => Promise<void>, verify: () => Promise<void> = async () => {}): Promise<Sample> {
  const start = performance.now()
  let durationMs: number | undefined
  let failureStage: "action" | "verification" = "action"
  try {
    await action()
    durationMs = performance.now() - start
    failureStage = "verification"
    await verify()
    return { durationMs, success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    const assertion = ["toHaveCount", "toHaveText", "toBeVisible", "toBeChecked", "toHaveURL", "toBe"].find((name) => message.includes(name)) ?? "operation"
    return { durationMs: durationMs ?? performance.now() - start, success: false, failureStage, assertion }
  }
}

export function summarizeSamples(samples: Sample[]) {
  if (samples.some((sample) => !Number.isFinite(sample.durationMs) || sample.durationMs < 0)) throw new Error("Invalid baseline duration")
  const durations = samples.filter((sample) => sample.success).map((sample) => sample.durationMs).sort((a, b) => a - b)
  const percentile = (p: number) => durations.length ? durations[Math.ceil(durations.length * p) - 1] : null
  return { total: samples.length, successful: durations.length, failed: samples.length - durations.length, p50: percentile(0.5), p95: percentile(0.95) }
}
