import { describe, expect, it } from "vitest"
import { recordSample, summarizeSamples } from "./measurements"

describe("baseline distributions", () => {
  it("records a failed verification only once and never counts it as a success", async () => {
    const sample = await recordSample(async () => {}, async () => { throw new Error("persistence failed") })
    expect(sample.success).toBe(false)
    expect(summarizeSamples([sample])).toMatchObject({ total: 1, successful: 0, failed: 1, p50: null })
  })

  it("records a disconnected action as a failed sample without running verification", async () => {
    let verified = false
    const sample = await recordSample(async () => { throw new Error("offline") }, async () => { verified = true })
    expect(sample.success).toBe(false)
    expect(verified).toBe(false)
  })
  it("uses nearest-rank p50/p95 and keeps failed samples out of successful timings", () => {
    const samples = Array.from({ length: 20 }, (_, index) => ({ durationMs: index + 1, success: true }))
    expect(summarizeSamples([...samples, { durationMs: 0, success: false }])).toEqual({ total: 21, successful: 20, failed: 1, p50: 10, p95: 19 })
  })

  it("does not invent a successful duration for an empty or failed run", () => {
    expect(summarizeSamples([])).toEqual({ total: 0, successful: 0, failed: 0, p50: null, p95: null })
    expect(summarizeSamples([{ durationMs: 0, success: false }])).toEqual({ total: 1, successful: 0, failed: 1, p50: null, p95: null })
  })

  it("rejects non-finite and negative timing values", () => {
    for (const durationMs of [NaN, Infinity, -1]) expect(() => summarizeSamples([{ durationMs, success: true }])).toThrow()
  })
})
