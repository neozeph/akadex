import { describe, expect, it, vi } from "vitest"

import {
  advancePomodoroSnapshot,
  completePomodoroSnapshot,
  createIdlePomodoroSnapshot,
  derivePomodoroSnapshot,
  getPomodoroTitle,
  getRemainingSecondsFromEndTime,
  parsePomodoroSnapshot,
  POMODORO_TIMER_STORAGE_KEY,
  startPomodoroSnapshot,
  pausePomodoroSnapshot,
  getPomodoroTimerStorageKey,
  parseAccountPomodoroSnapshot,
  saveCompletedPomodoroSnapshot,
  reconcilePomodoroSnapshots,
} from "@/lib/pomodoro-timer-state"

describe("Pomodoro timer persistence state", () => {
  it("uses the same deadline when two tabs discover completion at different times", () => {
    const running = startPomodoroSnapshot(createIdlePomodoroSnapshot("focus", 60, "session-1"), 1000)
    expect(derivePomodoroSnapshot(running, 90000).completedAt).toBe(61000)
    expect(derivePomodoroSnapshot(running, 120000).completedAt).toBe(61000)
  })

  it("protects a pending completion against stale reset, pause, and running snapshots", () => {
    const running = startPomodoroSnapshot(createIdlePomodoroSnapshot("focus", 60, "session-1"), 1000)
    const pending = derivePomodoroSnapshot(running, 61000)
    for (const stale of [running, pausePomodoroSnapshot(running, 2000), createIdlePomodoroSnapshot("focus", 60, "reset")]) {
      expect(reconcilePomodoroSnapshots(pending, stale)).toBe(pending)
      expect(reconcilePomodoroSnapshots(stale, pending)).toBe(pending)
    }
  })

  it("keeps acknowledged progress and does not reset a started break on duplicate acknowledgement", () => {
    const saved = createIdlePomodoroSnapshot("break", 60, "session-1", 1)
    const running = startPomodoroSnapshot(saved, 1000)
    expect(reconcilePomodoroSnapshots(running, saved)).toBe(running)
    expect(reconcilePomodoroSnapshots(saved, createIdlePomodoroSnapshot("focus", 60, "old", 0))).toBe(saved)
  })
  it("keeps a failed completion retryable with the same ID and timestamps after reload", async () => {
    const completed = completePomodoroSnapshot(startPomodoroSnapshot(createIdlePomodoroSnapshot("focus", 60, "session-1"), 1000), 61000)
    await expect(saveCompletedPomodoroSnapshot(completed, async () => { throw new Error("offline") }, 300)).rejects.toThrow("offline")
    const restored = parseAccountPomodoroSnapshot(JSON.stringify({ userId: "student-a", snapshot: completed }), "student-a")
    expect(restored).toMatchObject({ completionId: "session-1", startedAt: "1970-01-01T00:00:01.000Z", completedAt: 61000, completionHandled: false, sessionsCompleted: 0, status: "completed" })
  })

  it("advances and increments saved statistics only after acknowledgement", async () => {
    const completed = completePomodoroSnapshot(startPomodoroSnapshot(createIdlePomodoroSnapshot("focus", 60, "session-1"), 1000), 61000)
    let acknowledge: () => void = () => {}
    let payload: FormData | undefined
    const saving = saveCompletedPomodoroSnapshot(completed, async (form) => {
      payload = form
      await new Promise<void>((done) => { acknowledge = done })
    }, 300)
    expect(completed.sessionsCompleted).toBe(0)
    expect(completed.completionHandled).toBe(false)
    let settled = false
    void saving.then(() => { settled = true })
    await Promise.resolve()
    await Promise.resolve()
    expect(settled).toBe(false)
    expect(Object.fromEntries(payload!.entries())).toEqual({ duration: "60", completed: "true", started_at: "1970-01-01T00:00:01.000Z", ended_at: "1970-01-01T00:01:01.000Z", completion_id: "session-1" })
    acknowledge()
    expect(await saving).toMatchObject({ mode: "break", status: "idle", sessionsCompleted: 1, completionId: "session-1" })
  })

  it("does not restore another account's timer or unowned legacy state", () => {
    const snapshot = createIdlePomodoroSnapshot("focus", 60, "session-1")
    expect(getPomodoroTimerStorageKey("student-a")).not.toBe(getPomodoroTimerStorageKey("student-b"))
    expect(parseAccountPomodoroSnapshot(JSON.stringify({ userId: "student-a", snapshot }), "student-b")).toBeNull()
    expect(parseAccountPomodoroSnapshot(JSON.stringify(snapshot), "student-a")).toBeNull()
    expect(parseAccountPomodoroSnapshot("{", "student-a")).toBeNull()
  })

  it("retries an account-owned ambiguous handled flag rather than abandoning it", () => {
    const snapshot = { ...completePomodoroSnapshot(createIdlePomodoroSnapshot("focus", 60, "session-1"), 61000), completionHandled: true }
    expect(parseAccountPomodoroSnapshot(JSON.stringify({ userId: "student-a", snapshot }), "student-a")).toMatchObject({ completionHandled: false, completionId: "session-1" })
  })

  it("rejects corrupted timestamps that cannot form a stable save payload", () => {
    const completed = completePomodoroSnapshot(createIdlePomodoroSnapshot("focus", 60, "session-1"), 61000)
    expect(parsePomodoroSnapshot(JSON.stringify({ ...completed, completedAt: 1e99 }))).toBeNull()
    expect(parsePomodoroSnapshot(JSON.stringify({ ...completed, startedAt: "invalid timestamp" }))).toBeNull()
  })

  it("rejects a completion missing its original completion timestamp", () => {
    const completed = { ...completePomodoroSnapshot(createIdlePomodoroSnapshot("focus", 60, "session-1"), 61000), completedAt: null }
    expect(parsePomodoroSnapshot(JSON.stringify(completed))).toBeNull()
  })

  it("does not save a break or an already handled completion", async () => {
    const completed = completePomodoroSnapshot(createIdlePomodoroSnapshot("break", 60, "break-1"), 61000)
    let writes = 0
    const save = async () => { writes++ }
    await expect(saveCompletedPomodoroSnapshot(completed, save, 300)).rejects.toThrow()
    await expect(saveCompletedPomodoroSnapshot({ ...completed, mode: "focus", completionHandled: true }, save, 300)).rejects.toThrow()
    expect(writes).toBe(0)
  })
  it("starting creates an absolute endTime from the current clock", () => {
    const now = Date.UTC(2026, 0, 1, 8, 0, 0)
    const snapshot = createIdlePomodoroSnapshot("focus", 25 * 60, "session-1")

    expect(startPomodoroSnapshot(snapshot, now)).toMatchObject({
      status: "running",
      remainingSeconds: 25 * 60,
      endTime: now + 25 * 60 * 1000,
      startedAt: new Date(now).toISOString(),
      completionHandled: false,
    })
  })

  it("restores a running timer from persisted JSON after a remount", () => {
    const now = Date.UTC(2026, 0, 1, 8, 10, 0)
    const stored = startPomodoroSnapshot(createIdlePomodoroSnapshot("focus", 25 * 60, "session-1"), now)
    const restored = parsePomodoroSnapshot(JSON.stringify(stored))

    expect(restored).not.toBeNull()
    expect(derivePomodoroSnapshot(restored!, now + 5 * 60 * 1000)).toMatchObject({
      status: "running",
      remainingSeconds: 20 * 60,
      endTime: stored.endTime,
    })
  })

  it("restores a paused timer without resuming it", () => {
    const now = Date.UTC(2026, 0, 1, 8, 0, 0)
    const running = startPomodoroSnapshot(createIdlePomodoroSnapshot("break", 5 * 60, "session-1"), now)
    const paused = pausePomodoroSnapshot(running, now + 65_000)
    const restored = parsePomodoroSnapshot(JSON.stringify(paused))

    expect(restored).toMatchObject({
      status: "paused",
      remainingSeconds: 235,
      endTime: null,
    })
    expect(derivePomodoroSnapshot(restored!, now + 10 * 60 * 1000)).toMatchObject({
      status: "paused",
      remainingSeconds: 235,
    })
  })

  it("uses elapsed wall-clock time when the browser has been backgrounded", () => {
    const now = Date.UTC(2026, 0, 1, 8, 0, 0)
    const running = startPomodoroSnapshot(createIdlePomodoroSnapshot("focus", 1500, "session-1"), now)

    expect(derivePomodoroSnapshot(running, now + 149_250)).toMatchObject({
      status: "running",
      remainingSeconds: 1351,
    })
  })

  it("marks an expired timer complete", () => {
    const now = Date.UTC(2026, 0, 1, 8, 0, 0)
    const running = startPomodoroSnapshot(createIdlePomodoroSnapshot("focus", 60, "session-1"), now)

    expect(derivePomodoroSnapshot(running, now + 60_001)).toMatchObject({
      status: "completed",
      remainingSeconds: 0,
      endTime: null,
      completedAt: now + 60_000,
    })
  })

  it("keeps completion side effects one-shot by persisting completionHandled", () => {
    const completed = completePomodoroSnapshot(createIdlePomodoroSnapshot("focus", 60, "session-1"), 1000)
    const handled = { ...completed, completionHandled: true }
    const restored = parsePomodoroSnapshot(JSON.stringify(handled))

    expect(restored).toMatchObject({
      status: "completed",
      completionHandled: true,
      completionId: "session-1",
    })
  })

  it("reset can remove the active persisted state and return to an idle snapshot", () => {
    const storage = new Map<string, string>()
    const running = startPomodoroSnapshot(createIdlePomodoroSnapshot("focus", 1500, "session-1"), 1000)
    storage.set(POMODORO_TIMER_STORAGE_KEY, JSON.stringify(running))

    const reset = advancePomodoroSnapshot(running, "focus", 1500, "session-2")
    storage.delete(POMODORO_TIMER_STORAGE_KEY)

    expect(storage.has(POMODORO_TIMER_STORAGE_KEY)).toBe(false)
    expect(reset).toMatchObject({
      status: "idle",
      remainingSeconds: 1500,
      endTime: null,
      completionId: "session-2",
    })
  })

  it("rejects invalid localStorage data safely", () => {
    expect(parsePomodoroSnapshot("{")).toBeNull()
    expect(parsePomodoroSnapshot(null)).toBeNull()
    expect(
      parsePomodoroSnapshot(
        JSON.stringify({
          version: 999,
          mode: "focus",
          status: "running",
          durationSeconds: 1500,
          remainingSeconds: 1500,
          endTime: Date.now() + 1500,
          startedAt: null,
          completionId: "session-1",
          sessionsCompleted: 0,
          completedAt: null,
          completionHandled: false,
        }),
      ),
    ).toBeNull()
  })

  it("formats browser titles for running, paused, completed, and reset states", () => {
    expect(getPomodoroTitle({ mode: "focus", status: "running", remainingSeconds: 1475 })).toBe("24:35 • Focus | Akadex")
    expect(getPomodoroTitle({ mode: "break", status: "running", remainingSeconds: 275 })).toBe("04:35 • Break | Akadex")
    expect(getPomodoroTitle({ mode: "focus", status: "paused", remainingSeconds: 1475 })).toBe("Paused • 24:35 | Akadex")
    expect(getPomodoroTitle({ mode: "break", status: "paused", remainingSeconds: 275 })).toBe("Paused • 04:35 | Akadex")
    expect(getPomodoroTitle({ mode: "focus", status: "completed", remainingSeconds: 0 })).toBe("Time's up! | Akadex")
    expect(getPomodoroTitle({ mode: "focus", status: "idle", remainingSeconds: 1500 })).toBeNull()
  })

  it("calculates countdowns from timestamps without timezone offsets", () => {
    const endTime = Date.UTC(2026, 7, 25, 12, 0, 0)

    vi.stubEnv("TZ", "UTC")
    const utcRemaining = getRemainingSecondsFromEndTime(endTime, Date.UTC(2026, 7, 25, 11, 55, 30))

    vi.stubEnv("TZ", "Asia/Manila")
    const manilaRemaining = getRemainingSecondsFromEndTime(endTime, Date.UTC(2026, 7, 25, 11, 55, 30))

    vi.unstubAllEnvs()
    expect(utcRemaining).toBe(270)
    expect(manilaRemaining).toBe(270)
  })
})
