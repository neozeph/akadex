export const POMODORO_TIMER_STORAGE_KEY = "akadex:pomodoro-timer"
export const POMODORO_TIMER_SCHEMA_VERSION = 1

export function getPomodoroTimerStorageKey(userId: string) {
  return `${POMODORO_TIMER_STORAGE_KEY}:${userId}`
}

export function parseAccountPomodoroSnapshot(value: string | null, userId: string) {
  if (!value) return null
  try {
    const stored = JSON.parse(value)
    if (!stored || stored.userId !== userId || typeof stored.snapshot !== "object") return null
    const snapshot = parsePomodoroSnapshot(JSON.stringify(stored.snapshot))
    // A retained completion is pending even if an older client marked it early.
    // Replaying its stable ID is safe because the server insert is idempotent.
    return snapshot?.status === "completed" && snapshot.mode === "focus" ? { ...snapshot, completionHandled: false } : snapshot
  } catch { return null }
}

export type PomodoroMode = "focus" | "break"
export type PomodoroStatus = "idle" | "running" | "paused" | "completed"

export type PomodoroTimerSnapshot = {
  version: typeof POMODORO_TIMER_SCHEMA_VERSION
  mode: PomodoroMode
  status: PomodoroStatus
  durationSeconds: number
  remainingSeconds: number
  endTime: number | null
  startedAt: string | null
  completionId: string
  sessionsCompleted: number
  completedAt: number | null
  completionHandled: boolean
}

export function getRemainingSecondsFromEndTime(endTime: number, now = Date.now()) {
  return Math.max(0, Math.ceil((endTime - now) / 1000))
}

export function formatPomodoroClock(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export function getPomodoroTitle(
  snapshot: Pick<PomodoroTimerSnapshot, "mode" | "status" | "remainingSeconds">,
  appName = "Akadex",
) {
  if (snapshot.status === "completed") {
    return `Time's up! | ${appName}`
  }

  const clock = formatPomodoroClock(snapshot.remainingSeconds)
  const modeLabel = snapshot.mode === "focus" ? "Focus" : "Break"

  if (snapshot.status === "running") {
    return `${clock} • ${modeLabel} | ${appName}`
  }

  if (snapshot.status === "paused") {
    return `Paused • ${clock} | ${appName}`
  }

  return null
}

export function createIdlePomodoroSnapshot(
  mode: PomodoroMode,
  durationSeconds: number,
  completionId: string,
  sessionsCompleted = 0,
): PomodoroTimerSnapshot {
  return {
    version: POMODORO_TIMER_SCHEMA_VERSION,
    mode,
    status: "idle",
    durationSeconds,
    remainingSeconds: durationSeconds,
    endTime: null,
    startedAt: null,
    completionId,
    sessionsCompleted,
    completedAt: null,
    completionHandled: false,
  }
}

export function startPomodoroSnapshot(snapshot: PomodoroTimerSnapshot, now = Date.now()) {
  const remainingSeconds =
    snapshot.status === "running" && snapshot.endTime
      ? getRemainingSecondsFromEndTime(snapshot.endTime, now)
      : snapshot.remainingSeconds
  const safeRemainingSeconds = remainingSeconds > 0 ? remainingSeconds : snapshot.durationSeconds

  return {
    ...snapshot,
    status: "running" as const,
    remainingSeconds: safeRemainingSeconds,
    endTime: now + safeRemainingSeconds * 1000,
    startedAt: snapshot.startedAt ?? new Date(now).toISOString(),
    completedAt: null,
    completionHandled: false,
  }
}

export function pausePomodoroSnapshot(snapshot: PomodoroTimerSnapshot, now = Date.now()) {
  const remainingSeconds = snapshot.endTime ? getRemainingSecondsFromEndTime(snapshot.endTime, now) : snapshot.remainingSeconds

  return {
    ...snapshot,
    status: "paused" as const,
    remainingSeconds,
    endTime: null,
  }
}

export function completePomodoroSnapshot(snapshot: PomodoroTimerSnapshot, now = Date.now()) {
  return {
    ...snapshot,
    status: "completed" as const,
    remainingSeconds: 0,
    endTime: null,
    completedAt: now,
  }
}

export function advancePomodoroSnapshot(
  snapshot: PomodoroTimerSnapshot,
  nextMode: PomodoroMode,
  nextDurationSeconds: number,
  nextCompletionId: string,
  sessionsCompleted = snapshot.sessionsCompleted,
) {
  return createIdlePomodoroSnapshot(nextMode, nextDurationSeconds, nextCompletionId, sessionsCompleted)
}

export async function saveCompletedPomodoroSnapshot(
  snapshot: PomodoroTimerSnapshot,
  save: (formData: FormData) => Promise<void>,
  breakSeconds: number,
) {
  if (snapshot.mode !== "focus" || snapshot.status !== "completed" || snapshot.completionHandled || snapshot.completedAt === null) {
    throw new Error("No pending focus session to save")
  }
  const form = new FormData()
  form.set("duration", String(snapshot.durationSeconds))
  form.set("completed", "true")
  form.set("started_at", snapshot.startedAt ?? new Date(snapshot.completedAt - snapshot.durationSeconds * 1000).toISOString())
  form.set("ended_at", new Date(snapshot.completedAt).toISOString())
  form.set("completion_id", snapshot.completionId)
  await save(form)
  return advancePomodoroSnapshot(snapshot, "break", breakSeconds, snapshot.completionId, snapshot.sessionsCompleted + 1)
}

// Protect durable completion/acknowledgement progress from stale tabs.
export function reconcilePomodoroSnapshots(current: PomodoroTimerSnapshot, incoming: PomodoroTimerSnapshot) {
  if (current.sessionsCompleted !== incoming.sessionsCompleted) {
    return current.sessionsCompleted > incoming.sessionsCompleted ? current : incoming
  }
  if (current.mode === "focus" && current.status === "completed") return current
  if (incoming.mode === "focus" && incoming.status === "completed") return incoming
  if (incoming.mode === "break" && incoming.status === "idle") {
    if (current.mode === "break" && current.completionId === incoming.completionId && current.status !== "idle") return current
  }
  return incoming
}

export function derivePomodoroSnapshot(snapshot: PomodoroTimerSnapshot, now = Date.now()) {
  if (snapshot.status !== "running" || snapshot.endTime === null) {
    return snapshot
  }

  const remainingSeconds = getRemainingSecondsFromEndTime(snapshot.endTime, now)

  if (remainingSeconds === 0) {
    return completePomodoroSnapshot(snapshot, snapshot.endTime)
  }

  return {
    ...snapshot,
    remainingSeconds,
  }
}

export function parsePomodoroSnapshot(value: string | null) {
  if (!value) {
    return null
  }

  try {
    const parsed = JSON.parse(value) as Partial<PomodoroTimerSnapshot>

    if (
      parsed.version !== POMODORO_TIMER_SCHEMA_VERSION ||
      (parsed.mode !== "focus" && parsed.mode !== "break") ||
      (parsed.status !== "idle" &&
        parsed.status !== "running" &&
        parsed.status !== "paused" &&
        parsed.status !== "completed") ||
      !isPositiveInteger(parsed.durationSeconds) ||
      !isNonNegativeInteger(parsed.remainingSeconds) ||
      parsed.remainingSeconds > parsed.durationSeconds ||
      (parsed.endTime !== null && !isPositiveNumber(parsed.endTime)) ||
      (parsed.status === "running" && parsed.endTime === null) ||
      (parsed.status !== "running" && parsed.endTime !== null) ||
      (parsed.startedAt !== null && (typeof parsed.startedAt !== "string" || !Number.isFinite(Date.parse(parsed.startedAt)))) ||
      typeof parsed.completionId !== "string" ||
      parsed.completionId.length === 0 ||
      !isNonNegativeInteger(parsed.sessionsCompleted) ||
      (parsed.completedAt !== null && !isPositiveNumber(parsed.completedAt)) ||
      (parsed.status === "completed" && (parsed.completedAt === null || parsed.remainingSeconds !== 0)) ||
      typeof parsed.completionHandled !== "boolean"
    ) {
      return null
    }

    return parsed as PomodoroTimerSnapshot
  } catch {
    return null
  }
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && Number.isFinite(new Date(value).getTime())
}
