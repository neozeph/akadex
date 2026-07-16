"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { Pause, Play, RotateCcw, CheckCircle2, Coffee } from "lucide-react"

import { Button } from "@/components/ui/button"

type Mode = "focus" | "break"

type PomodoroTimerProps = {
  focusMinutes?: number
  breakMinutes?: number
  onCompleteSession: (formData: FormData) => Promise<void>
}

export function PomodoroTimer({
  focusMinutes = 25,
  breakMinutes = 5,
  onCompleteSession,
}: PomodoroTimerProps) {
  const [mode, setMode] = useState<Mode>("focus")
  const [isRunning, setIsRunning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(focusMinutes * 60)
  const [sessionsCompleted, setSessionsCompleted] = useState(0)
  const [isPending, startTransition] = useTransition()
  const startedAtRef = useRef<string | null>(null)

  const initialSeconds = mode === "focus" ? focusMinutes * 60 : breakMinutes * 60

  const progress = useMemo(() => {
    if (initialSeconds <= 0) {
      return 0
    }

    return Math.max(0, Math.min(100, ((initialSeconds - secondsLeft) / initialSeconds) * 100))
  }, [initialSeconds, secondsLeft])

  useEffect(() => {
    if (!isRunning) {
      return
    }

    const interval = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(interval)
          setIsRunning(false)

          const completedSeconds = initialSeconds
          const startedAt = startedAtRef.current ?? new Date(Date.now() - completedSeconds * 1000).toISOString()
          const endedAt = new Date().toISOString()

          if (mode === "focus") {
            const formData = new FormData()
            formData.set("duration", String(completedSeconds))
            formData.set("completed", "true")
            formData.set("started_at", startedAt)
            formData.set("ended_at", endedAt)

            startTransition(async () => {
              await onCompleteSession(formData)
              setSessionsCompleted((count) => count + 1)
            })
          }

          setMode((currentMode) => (currentMode === "focus" ? "break" : "focus"))
          startedAtRef.current = null
          return mode === "focus" ? breakMinutes * 60 : focusMinutes * 60
        }

        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(interval)
  }, [isRunning, mode, focusMinutes, breakMinutes, initialSeconds, onCompleteSession, startTransition])

  function resetTimer() {
    setIsRunning(false)
    startedAtRef.current = null
    setSecondsLeft(mode === "focus" ? focusMinutes * 60 : breakMinutes * 60)
  }

  function toggleMode(nextMode: Mode) {
    setIsRunning(false)
    startedAtRef.current = null
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

  return (
    <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.25em] text-muted-foreground uppercase">
            Pomodoro
          </p>
          <h1 className="mt-4 text-3xl font-semibold">Focus with purpose</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Keep a simple cycle: focus, short break, repeat. Completed focus sessions
            are saved automatically.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[2rem] border border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Current mode</p>
              <p className="mt-1 text-xl font-semibold capitalize">{mode}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {sessionsCompleted} focus session{sessionsCompleted === 1 ? "" : "s"} completed
            </p>
          </div>

          <div className="mt-8 flex items-center justify-center">
            <div className="relative flex size-[18rem] items-center justify-center rounded-full border border-border bg-background shadow-inner">
              <div
                className="absolute inset-3 rounded-full bg-[conic-gradient(var(--primary)_0%_var(--progress),transparent_var(--progress)_100%)]"
                style={{ ["--progress" as never]: `${progress}%` }}
              />
              <div className="absolute inset-5 rounded-full bg-card" />
              <div className="relative text-center">
                <p className="text-sm font-semibold tracking-[0.25em] text-muted-foreground uppercase">
                  {mode === "focus" ? "Focus time" : "Break time"}
                </p>
                <p className="mt-3 text-6xl font-semibold tabular-nums">
                  {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button onClick={toggleRunning} size="lg" className="min-w-32">
              {isRunning ? <Pause className="size-4" /> : <Play className="size-4" />}
              {isRunning ? "Pause" : "Start"}
            </Button>
            <Button variant="outline" onClick={resetTimer} size="lg" className="min-w-32">
              <RotateCcw className="size-4" />
              Reset
            </Button>
          </div>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {isPending ? "Saving session..." : "Focus sessions are automatically stored when they finish."}
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-[2rem] border border-border p-5">
            <p className="text-sm text-muted-foreground">Focus default</p>
            <p className="mt-2 text-2xl font-semibold">{focusMinutes} minutes</p>
          </div>
          <div className="rounded-[2rem] border border-border p-5">
            <p className="text-sm text-muted-foreground">Break default</p>
            <p className="mt-2 text-2xl font-semibold">{breakMinutes} minutes</p>
          </div>
          <div className="rounded-[2rem] border border-border p-5">
            <p className="text-sm text-muted-foreground">Auto logging</p>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              When a focus cycle reaches zero, Akadeks saves the session to Supabase
              and updates dashboard metrics.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
