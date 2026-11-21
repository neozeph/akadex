"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { Pause, Play, RotateCcw, CheckCircle2, Coffee } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useTaskAccount } from "@/components/tasks/task-cache-provider"
import { DEFAULT_BREAK_MINUTES, DEFAULT_FOCUS_MINUTES } from "@/lib/pomodoro"
import {
  advancePomodoroSnapshot,
  createIdlePomodoroSnapshot,
  derivePomodoroSnapshot,
  formatPomodoroClock,
  getPomodoroTitle,
  parseAccountPomodoroSnapshot,
  getPomodoroTimerStorageKey,
  saveCompletedPomodoroSnapshot,
  reconcilePomodoroSnapshots,
  pausePomodoroSnapshot,
  POMODORO_TIMER_STORAGE_KEY,
  startPomodoroSnapshot,
  type PomodoroMode,
  type PomodoroTimerSnapshot,
} from "@/lib/pomodoro-timer-state"

type PomodoroTimerProps = {
  userId: string
  focusMinutes?: number
  breakMinutes?: number
  onCompleteSession: (formData: FormData) => Promise<{ accountChanged: boolean }>
}

export function PomodoroTimer({
  userId,
  focusMinutes = DEFAULT_FOCUS_MINUTES,
  breakMinutes = DEFAULT_BREAK_MINUTES,
  onCompleteSession,
}: PomodoroTimerProps) {
  const {isCurrent,sessionLost}=useTaskAccount()
  const [snapshot, setSnapshot] = useState<PomodoroTimerSnapshot>(() =>
    createIdlePomodoroSnapshot("focus", focusMinutes * 60, createCompletionId()),
  )
  const [hasHydrated, setHasHydrated] = useState(false)
  const [announcement, setAnnouncement] = useState("")
  const [failedCompletionId, setFailedCompletionId] = useState<string | null>(null)
  const [storageError, setStorageError] = useState(false)
  const [restoreWarning, setRestoreWarning] = useState("")
  const [isPending, startTransition] = useTransition()
  const lastTitleRef = useRef<string | null>(null)
  const originalTitleRef = useRef<string | null>(null)
  const attemptedCompletionIdsRef = useRef(new Set<string>())
  const inFlightRef = useRef<string | null>(null)
  const storageKey = getPomodoroTimerStorageKey(userId)

  const mode = snapshot.mode
  const isRunning = snapshot.status === "running"
  const secondsLeft = snapshot.remainingSeconds
  const initialSeconds = snapshot.durationSeconds
  const sessionsCompleted = snapshot.sessionsCompleted
  const pendingFocus = mode === "focus" && snapshot.status === "completed"
  const saveFailed = pendingFocus && failedCompletionId === snapshot.completionId

  const progress = useMemo(() => {
    if (initialSeconds <= 0) {
      return 0
    }

    return Math.max(0, Math.min(100, ((initialSeconds - secondsLeft) / initialSeconds) * 100))
  }, [initialSeconds, secondsLeft])

  useEffect(() => {
    let stored: PomodoroTimerSnapshot | null = null
    let warning = ""
    let unavailable = false
    try {
      const raw = window.localStorage.getItem(storageKey)
      stored = parseAccountPomodoroSnapshot(raw, userId)
      if (raw && !stored) warning = "The stored timer could not be restored. Start a new session."
      else if (!stored && window.localStorage.getItem(POMODORO_TIMER_STORAGE_KEY)) {
        warning = "An older timer is not linked to this account and was not restored. Start a new session."
      }
    } catch { unavailable = true }
    window.queueMicrotask(() => {
      if (stored) setSnapshot(derivePomodoroSnapshot(stored))
      setRestoreWarning(warning)
      setStorageError(unavailable)
      setHasHydrated(true)
    })
  }, [storageKey, userId])

  useEffect(() => {
    if (!hasHydrated) {
      return
    }

    try {
      const raw = window.localStorage.getItem(storageKey)
      const stored = parseAccountPomodoroSnapshot(raw, userId)
      const safe = stored ? reconcilePomodoroSnapshots(derivePomodoroSnapshot(stored), snapshot) : snapshot
      if (safe !== snapshot && JSON.stringify(safe) !== JSON.stringify(snapshot)) {
        window.queueMicrotask(() => setSnapshot(safe))
        return
      }
      // The deadline is durable; ticking remainingSeconds needs no storage write.
      if (stored?.status === "running" && snapshot.status === "running" && stored.completionId === snapshot.completionId && stored.endTime === snapshot.endTime && stored.sessionsCompleted === snapshot.sessionsCompleted) return
      const next = JSON.stringify({ userId, snapshot })
      if (raw !== next) window.localStorage.setItem(storageKey, next)
    } catch { window.queueMicrotask(() => setStorageError(true)) }
  }, [hasHydrated, snapshot, storageKey, userId])

  useEffect(() => {
    function syncFromStorage(event: StorageEvent) {
      if (event.key !== storageKey) {
        return
      }

      // Read the latest value: queued storage events can describe superseded writes.
      try {
        const stored = parseAccountPomodoroSnapshot(window.localStorage.getItem(storageKey), userId)
        if (stored) setSnapshot((current) => reconcilePomodoroSnapshots(current, derivePomodoroSnapshot(stored)))
      } catch { setStorageError(true) }
    }

    window.addEventListener("storage", syncFromStorage)

    return () => window.removeEventListener("storage", syncFromStorage)
  }, [focusMinutes, storageKey, userId])

  useEffect(() => {
    originalTitleRef.current = document.title

    return () => {
      if (originalTitleRef.current !== null) {
        document.title = originalTitleRef.current
      }
    }
  }, [])

  useEffect(() => {
    const nextTitle = getPomodoroTitle(snapshot)

    if (nextTitle === null) {
      if (lastTitleRef.current !== null) {
        document.title = originalTitleRef.current ?? "Akadex"
        lastTitleRef.current = null
      }
      return
    }

    if (lastTitleRef.current !== nextTitle) {
      document.title = nextTitle
      lastTitleRef.current = nextTitle
    }
  }, [snapshot])

  useEffect(() => {
    function recalculate() {
      setSnapshot((current) => derivePomodoroSnapshot(current))
    }

    recalculate()
    const interval = window.setInterval(recalculate, 1000)
    window.addEventListener("visibilitychange", recalculate)
    window.addEventListener("focus", recalculate)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener("visibilitychange", recalculate)
      window.removeEventListener("focus", recalculate)
    }
  }, [])

  const submitCompletion = useCallback((completed: PomodoroTimerSnapshot) => {
    if (inFlightRef.current) return
    inFlightRef.current = completed.completionId
    setFailedCompletionId(null)
    setAnnouncement("Saving focus session...")
    startTransition(async () => {
      try {
        const next = await saveCompletedPomodoroSnapshot(completed, async(form)=>{
          const result=await onCompleteSession(form)
          if(!isCurrent())throw new Error("Account session changed")
          if(result.accountChanged){sessionLost();throw new Error("Account session changed")}
        }, breakMinutes * 60)
        if(!isCurrent())return
        setSnapshot((current) => current.mode === "focus" && current.status === "completed" && current.completionId === completed.completionId ? next : current)
        setAnnouncement("Focus session saved. Break ready.")
      } catch {
        if(!isCurrent())return
        setFailedCompletionId(completed.completionId)
        setAnnouncement("Unable to save this focus session. Try again.")
      } finally { inFlightRef.current = null }
    })
  }, [onCompleteSession, breakMinutes, isCurrent, sessionLost])

  useEffect(() => {
    const attemptKey = `${snapshot.mode}:${snapshot.completionId}`
    if (!hasHydrated || snapshot.status !== "completed" || attemptedCompletionIdsRef.current.has(attemptKey)) return
    if (snapshot.mode === "focus" && inFlightRef.current) return
    attemptedCompletionIdsRef.current.add(attemptKey)
    window.queueMicrotask(() => {
      if (snapshot.mode === "focus") submitCompletion(snapshot)
      else {
        setSnapshot((current) => current.completionId === snapshot.completionId ? advancePomodoroSnapshot(current, "focus", focusMinutes * 60, createCompletionId()) : current)
        setAnnouncement("Break complete. Focus ready.")
      }
    })
  }, [hasHydrated, snapshot, focusMinutes, submitCompletion, isPending])

  const previousDurationsRef = useRef({ focusMinutes, breakMinutes })

  useEffect(() => {
    const previous = previousDurationsRef.current
    const changed = previous.focusMinutes !== focusMinutes || previous.breakMinutes !== breakMinutes
    previousDurationsRef.current = { focusMinutes, breakMinutes }

    if (changed && snapshot.status === "idle") {
      setSnapshot((current) =>
        createIdlePomodoroSnapshot(
          current.mode,
          current.mode === "focus" ? focusMinutes * 60 : breakMinutes * 60,
          current.completionId,
          current.sessionsCompleted,
        ),
      )
    }
  }, [focusMinutes, breakMinutes, snapshot.status])

  function resetTimer() {
    setSnapshot((current) =>
      createIdlePomodoroSnapshot(
        current.mode,
        current.mode === "focus" ? focusMinutes * 60 : breakMinutes * 60,
        createCompletionId(),
        current.sessionsCompleted,
      ),
    )
  }

  function toggleMode(nextMode: PomodoroMode) {
    setSnapshot((current) =>
      createIdlePomodoroSnapshot(
        nextMode,
        nextMode === "focus" ? focusMinutes * 60 : breakMinutes * 60,
        createCompletionId(),
        current.sessionsCompleted,
      ),
    )
    setAnnouncement(`${nextMode === "focus" ? "Focus" : "Break"} started.`)
  }

  function toggleRunning() {
    setSnapshot((current) => (current.status === "running" ? pausePomodoroSnapshot(current) : startPomodoroSnapshot(current)))
  }

  const clock = formatPomodoroClock(secondsLeft)
  const ringColorVar = mode === "focus" ? "var(--terracotta)" : "var(--primary)"

  return (
    <div className="space-y-4">
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <div className="flex items-center justify-center gap-2">
        <Button
          variant={mode === "focus" ? "default" : "outline"}
          size="sm"
          onClick={() => toggleMode("focus")}
          disabled={!hasHydrated || pendingFocus}
        >
          <CheckCircle2 className="size-4" />
          Focus
        </Button>
        <Button
          variant={mode === "break" ? "default" : "outline"}
          size="sm"
          onClick={() => toggleMode("break")}
          disabled={!hasHydrated || pendingFocus}
        >
          <Coffee className="size-4" />
          Break
        </Button>
      </div>

      <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-center">
          <div className="relative flex size-56 items-center justify-center rounded-full border border-border bg-background shadow-inner sm:size-64">
            <div
              className="absolute inset-3 rounded-full bg-[conic-gradient(var(--ring-color)_0%_var(--progress),transparent_var(--progress)_100%)]"
              style={{ ["--progress" as never]: `${progress}%`, ["--ring-color" as never]: ringColorVar }}
            />
            <div className="absolute inset-5 rounded-full bg-card" />
            <div className="relative text-center">
              <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                {mode === "focus" ? "Focus time" : "Break time"}
              </p>
              <p className="mt-2 text-5xl font-semibold tabular-nums sm:text-6xl">{clock}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={toggleRunning} disabled={!hasHydrated || pendingFocus} size="lg" className="min-w-32">
            {isRunning ? <Pause className="size-4" /> : <Play className="size-4" />}
            {isRunning ? "Pause" : "Start"}
          </Button>
          <Button variant="outline" onClick={resetTimer} disabled={!hasHydrated || pendingFocus} size="lg" className="min-w-32">
            <RotateCcw className="size-4" />
            Reset
          </Button>
        </div>

        <p className="mt-3 text-center text-sm text-muted-foreground">
          {pendingFocus && isPending
            ? "Saving session..."
            : `${sessionsCompleted} focus session${sessionsCompleted === 1 ? "" : "s"} saved`}
        </p>
        {saveFailed ? (
          <div className="mt-3 space-y-3 text-center">
            <p role="alert" className="text-sm text-destructive">Unable to save this focus session. Try again.</p>
            <Button disabled={isPending} onClick={() => submitCompletion(snapshot)}>Retry save</Button>
          </div>
        ) : null}
        {storageError ? <p role="alert" className="mt-3 text-sm text-destructive">This device cannot keep the timer between visits. Keep this page open until your session is saved.</p> : null}
        {restoreWarning ? <p role="status" className="mt-3 text-sm text-muted-foreground">{restoreWarning}</p> : null}
      </div>
    </div>
  )
}

function createCompletionId() {
  return crypto.randomUUID()
}
