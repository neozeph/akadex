export const POMODORO_TIMER_STORAGE_KEY = "akadex:pomodoro-timer"
export const POMODORO_TIMER_SCHEMA_VERSION = 1

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

export function derivePomodoroSnapshot(snapshot: PomodoroTimerSnapshot, now = Date.now()) {
  if (snapshot.status !== "running" || snapshot.endTime === null) {
    return snapshot
  }

  const remainingSeconds = getRemainingSecondsFromEndTime(snapshot.endTime, now)

  if (remainingSeconds === 0) {
    return completePomodoroSnapshot(snapshot, now)
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
      (parsed.startedAt !== null && typeof parsed.startedAt !== "string") ||
      typeof parsed.completionId !== "string" ||
      parsed.completionId.length === 0 ||
      !isNonNegativeInteger(parsed.sessionsCompleted) ||
      (parsed.completedAt !== null && !isPositiveNumber(parsed.completedAt)) ||
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
  return typeof value === "number" && Number.isFinite(value) && value > 0
}
