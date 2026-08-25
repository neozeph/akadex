"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { Pause, Play, RotateCcw, CheckCircle2, Coffee } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DEFAULT_BREAK_MINUTES, DEFAULT_FOCUS_MINUTES } from "@/lib/pomodoro"
import {
  advancePomodoroSnapshot,
  createIdlePomodoroSnapshot,
  derivePomodoroSnapshot,
  formatPomodoroClock,
  getPomodoroTitle,
  parsePomodoroSnapshot,
  pausePomodoroSnapshot,
  POMODORO_TIMER_STORAGE_KEY,
  startPomodoroSnapshot,
  type PomodoroMode,
  type PomodoroTimerSnapshot,
} from "@/lib/pomodoro-timer-state"

type PomodoroTimerProps = {
  focusMinutes?: number
  breakMinutes?: number
  onCompleteSession: (formData: FormData) => Promise<void>
}

export function PomodoroTimer({
  focusMinutes = DEFAULT_FOCUS_MINUTES,
  breakMinutes = DEFAULT_BREAK_MINUTES,
  onCompleteSession,
}: PomodoroTimerProps) {
  const [snapshot, setSnapshot] = useState<PomodoroTimerSnapshot>(() =>
    createIdlePomodoroSnapshot("focus", focusMinutes * 60, createCompletionId()),
  )
  const [hasHydrated, setHasHydrated] = useState(false)
  const [announcement, setAnnouncement] = useState("")
  const [isPending, startTransition] = useTransition()
  const lastTitleRef = useRef<string | null>(null)
  const originalTitleRef = useRef<string | null>(null)
  const handledCompletionIdsRef = useRef(new Set<string>())

  const mode = snapshot.mode
  const isRunning = snapshot.status === "running"
  const secondsLeft = snapshot.remainingSeconds
  const initialSeconds = snapshot.durationSeconds
  const sessionsCompleted = snapshot.sessionsCompleted

  const progress = useMemo(() => {
    if (initialSeconds <= 0) {
      return 0
    }

    return Math.max(0, Math.min(100, ((initialSeconds - secondsLeft) / initialSeconds) * 100))
  }, [initialSeconds, secondsLeft])

  useEffect(() => {
    const stored = parsePomodoroSnapshot(window.localStorage.getItem(POMODORO_TIMER_STORAGE_KEY))

    window.queueMicrotask(() => {
      if (stored) {
        setSnapshot(derivePomodoroSnapshot(stored))
      } else {
        window.localStorage.removeItem(POMODORO_TIMER_STORAGE_KEY)
      }

      setHasHydrated(true)
    })
  }, [])

  useEffect(() => {
    if (!hasHydrated) {
      return
    }

    if (snapshot.status === "idle") {
      window.localStorage.removeItem(POMODORO_TIMER_STORAGE_KEY)
    } else {
      window.localStorage.setItem(POMODORO_TIMER_STORAGE_KEY, JSON.stringify(snapshot))
    }
  }, [hasHydrated, snapshot])

  useEffect(() => {
    function syncFromStorage(event: StorageEvent) {
      if (event.key !== POMODORO_TIMER_STORAGE_KEY) {
        return
      }

      const stored = parsePomodoroSnapshot(event.newValue)
      setSnapshot(
        stored
          ? derivePomodoroSnapshot(stored)
          : createIdlePomodoroSnapshot("focus", focusMinutes * 60, createCompletionId()),
      )
    }

    window.addEventListener("storage", syncFromStorage)

    return () => window.removeEventListener("storage", syncFromStorage)
  }, [focusMinutes])

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

  useEffect(() => {
    if (
      snapshot.status !== "completed" ||
      snapshot.completionHandled ||
      handledCompletionIdsRef.current.has(snapshot.completionId)
    ) {
      return
    }

    handledCompletionIdsRef.current.add(snapshot.completionId)

    const completedSeconds = snapshot.durationSeconds
    const completedAt = snapshot.completedAt ?? Date.now()
    const startedAt = snapshot.startedAt ?? new Date(completedAt - completedSeconds * 1000).toISOString()
    const endedAt = new Date(completedAt).toISOString()
    const completionId = snapshot.completionId
    const nextMode: PomodoroMode = mode === "focus" ? "break" : "focus"

    window.queueMicrotask(() => {
      setSnapshot((current) => ({ ...current, completionHandled: true }))
    })

    if (mode === "focus") {
      const formData = new FormData()
      formData.set("duration", String(completedSeconds))
      formData.set("completed", "true")
      formData.set("started_at", startedAt)
      formData.set("ended_at", endedAt)
      formData.set("completion_id", completionId)

      startTransition(async () => {
        await onCompleteSession(formData)
        setSnapshot((current) =>
          advancePomodoroSnapshot(current, "break", breakMinutes * 60, createCompletionId(), current.sessionsCompleted + 1),
        )
      })
    } else {
      window.queueMicrotask(() => {
        setSnapshot((current) => advancePomodoroSnapshot(current, "focus", focusMinutes * 60, createCompletionId()))
      })
    }

    setAnnouncement(
      `${mode === "focus" ? "Focus" : "Break"} session completed. ${nextMode === "focus" ? "Focus" : "Break"} started.`,
    )
  }, [snapshot, mode, focusMinutes, breakMinutes, onCompleteSession, startTransition])

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
        >
          <CheckCircle2 className="size-4" />
          Focus
        </Button>
        <Button
          variant={mode === "break" ? "default" : "outline"}
          size="sm"
          onClick={() => toggleMode("break")}
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
          <Button onClick={toggleRunning} size="lg" className="min-w-32">
            {isRunning ? <Pause className="size-4" /> : <Play className="size-4" />}
            {isRunning ? "Pause" : "Start"}
          </Button>
          <Button variant="outline" onClick={resetTimer} size="lg" className="min-w-32">
            <RotateCcw className="size-4" />
            Reset
          </Button>
        </div>

        <p className="mt-3 text-center text-sm text-muted-foreground">
          {isPending
            ? "Saving session..."
            : `${sessionsCompleted} focus session${sessionsCompleted === 1 ? "" : "s"} completed this visit`}
        </p>
      </div>
    </div>
  )
}

function createCompletionId() {
  return crypto.randomUUID()
}
