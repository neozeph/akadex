"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { Pause, Play, RotateCcw, CheckCircle2, Coffee } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DEFAULT_BREAK_MINUTES, DEFAULT_FOCUS_MINUTES } from "@/lib/pomodoro"

type Mode = "focus" | "break"

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
  const [mode, setMode] = useState<Mode>("focus")
  const [isRunning, setIsRunning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(focusMinutes * 60)
  const [sessionsCompleted, setSessionsCompleted] = useState(0)
  const [isPending, startTransition] = useTransition()
  const startedAtRef = useRef<string | null>(null)

  // One stable id per logical timer run, sent to the server so a repeated
  // completion request (see below) can never insert twice for the same
  // run. Regenerated only where a genuinely NEW run begins (reset, mode
  // switch, or auto-advancing into the next mode after completion) — never
  // on pause/resume, and never merely because the component re-rendered.
  const sessionIdRef = useRef<string | null>(null)
  if (sessionIdRef.current === null) {
    sessionIdRef.current = crypto.randomUUID()
  }

  // Guards against handling the same zero-crossing more than once. React
  // may invoke a state updater function more than once for a single
  // logical update (Strict Mode does this deliberately in development to
  // surface impure updaters) — completion side effects used to live inside
  // exactly such an updater, which is what caused one finished session to
  // log itself hundreds of times. Completion now only ever happens here, in
  // a plain effect, gated by this ref.
  const completionHandledRef = useRef(false)

  const initialSeconds = mode === "focus" ? focusMinutes * 60 : breakMinutes * 60

  const progress = useMemo(() => {
    if (initialSeconds <= 0) {
      return 0
    }

    return Math.max(0, Math.min(100, ((initialSeconds - secondsLeft) / initialSeconds) * 100))
  }, [initialSeconds, secondsLeft])

  // Ticking is now a PURE decrement — no side effects inside the updater.
  // It only ever counts down to 0 and stops there; it never itself decides
  // what a "zero" means (that's the completion effect's job below).
  useEffect(() => {
    if (!isRunning) {
      return
    }

    const interval = window.setInterval(() => {
      setSecondsLeft((current) => (current > 0 ? current - 1 : 0))
    }, 1000)

    return () => window.clearInterval(interval)
  }, [isRunning])

  /**
   * Fires exactly once per zero-crossing. Whenever secondsLeft is above
   * zero, the guard is kept armed (false) — that covers every "a new run's
   * duration is now in effect" case (reset, mode switch, completion's own
   * mode-advance, or the idle-preference-sync effect below) without those
   * call sites needing to touch the ref themselves. Only when secondsLeft
   * is exactly 0 AND the guard hasn't already fired do we run completion:
   * stop the timer, log the session (focus only, matching Sprint 6), and
   * advance into the next mode with a fresh id for the next run.
   */
  useEffect(() => {
    if (secondsLeft > 0) {
      completionHandledRef.current = false
      return
    }

    if (completionHandledRef.current) {
      return
    }
    completionHandledRef.current = true

    setIsRunning(false)

    const completedSeconds = initialSeconds
    const startedAt = startedAtRef.current ?? new Date(Date.now() - completedSeconds * 1000).toISOString()
    const endedAt = new Date().toISOString()
    const completionId = sessionIdRef.current as string

    if (mode === "focus") {
      const formData = new FormData()
      formData.set("duration", String(completedSeconds))
      formData.set("completed", "true")
      formData.set("started_at", startedAt)
      formData.set("ended_at", endedAt)
      formData.set("completion_id", completionId)

      startTransition(async () => {
        await onCompleteSession(formData)
        setSessionsCompleted((count) => count + 1)
      })
    }

    startedAtRef.current = null
    const nextMode: Mode = mode === "focus" ? "break" : "focus"
    sessionIdRef.current = crypto.randomUUID()
    setMode(nextMode)
    setSecondsLeft(nextMode === "focus" ? focusMinutes * 60 : breakMinutes * 60)
  }, [secondsLeft, mode, initialSeconds, focusMinutes, breakMinutes, onCompleteSession, startTransition])

  // Saved preferences (focusMinutes/breakMinutes) can change after mount —
  // the Settings dialog updates them via a prop, not local state. While the
  // timer is idle, the visible countdown should reflect the new duration
  // right away. While it's running, we deliberately do nothing here: the
  // active countdown keeps ticking from wherever it is, and the new value is
  // simply what resetTimer()/toggleMode()/the next natural completion will
  // use, since those all read the live focusMinutes/breakMinutes props
  // directly rather than a stale copy.
  const previousDurationsRef = useRef({ focusMinutes, breakMinutes })

  useEffect(() => {
    const previous = previousDurationsRef.current
    const changed = previous.focusMinutes !== focusMinutes || previous.breakMinutes !== breakMinutes
    previousDurationsRef.current = { focusMinutes, breakMinutes }

    if (changed && !isRunning) {
      setSecondsLeft(mode === "focus" ? focusMinutes * 60 : breakMinutes * 60)
    }
  }, [focusMinutes, breakMinutes, isRunning, mode])

  function resetTimer() {
    setIsRunning(false)
    startedAtRef.current = null
    sessionIdRef.current = crypto.randomUUID()
    setSecondsLeft(mode === "focus" ? focusMinutes * 60 : breakMinutes * 60)
  }

  function toggleMode(nextMode: Mode) {
    setIsRunning(false)
    startedAtRef.current = null
    sessionIdRef.current = crypto.randomUUID()
    setMode(nextMode)
    setSecondsLeft(nextMode === "focus" ? focusMinutes * 60 : breakMinutes * 60)
  }

  function toggleRunning() {
    if (!isRunning && !startedAtRef.current) {
      startedAtRef.current = new Date().toISOString()
    }

    setIsRunning((value) => !value)
  }

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const ringColorVar = mode === "focus" ? "var(--terracotta)" : "var(--primary)"

  return (
    <div className="space-y-4">
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
              <p className="mt-2 text-5xl font-semibold tabular-nums sm:text-6xl">
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </p>
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
