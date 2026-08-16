"use client"

import * as React from "react"
import { Loader2, Save, Settings2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { MAX_POMODORO_MINUTES, MIN_POMODORO_MINUTES } from "@/lib/pomodoro"

type PomodoroSettingsDialogProps = {
  focusMinutes: number
  breakMinutes: number
  onSave: (formData: FormData) => Promise<void>
}

const PRESETS = [
  { focus: 25, breakMinutes: 5, label: "25 / 5" },
  { focus: 50, breakMinutes: 10, label: "50 / 10" },
] as const

/**
 * Compact trigger doubles as a status readout ("Focus 25m · Break 5m") so
 * the current cycle is visible without opening anything — lives in the
 * PageHeader's action slot, so it costs zero extra vertical space and can't
 * push Start below the fold. Presets just prefill the two number inputs;
 * custom values remain fully editable either way.
 */
export function PomodoroSettingsDialog({ focusMinutes, breakMinutes, onSave }: PomodoroSettingsDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [focusValue, setFocusValue] = React.useState(focusMinutes)
  const [breakValue, setBreakValue] = React.useState(breakMinutes)
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()

  function handleOpenChange(next: boolean) {
    if (isPending) {
      return
    }

    if (next) {
      setFocusValue(focusMinutes)
      setBreakValue(breakMinutes)
      setError(null)
    }

    setOpen(next)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)

    setError(null)
    startTransition(async () => {
      try {
        await onSave(formData)
        setOpen(false)
      } catch {
        setError("Something went wrong saving your Pomodoro settings. Please try again.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="size-4" />
          Focus {focusMinutes}m · Break {breakMinutes}m
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pomodoro settings</DialogTitle>
          <DialogDescription>Set how long your focus and break rounds run.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="focus_duration_minutes">
                Focus duration
              </label>
              <div className="relative">
                <input
                  id="focus_duration_minutes"
                  name="focus_duration_minutes"
                  type="number"
                  inputMode="numeric"
                  min={MIN_POMODORO_MINUTES}
                  max={MAX_POMODORO_MINUTES}
                  step={1}
                  value={focusValue}
                  onChange={(event) => setFocusValue(Number(event.target.value))}
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 pr-12 text-sm outline-none transition focus:border-foreground focus:ring-3 focus:ring-primary/20"
                  disabled={isPending}
                  required
                />
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-muted-foreground">
                  min
                </span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="break_duration_minutes">
                Break duration
              </label>
              <div className="relative">
                <input
                  id="break_duration_minutes"
                  name="break_duration_minutes"
                  type="number"
                  inputMode="numeric"
                  min={MIN_POMODORO_MINUTES}
                  max={MAX_POMODORO_MINUTES}
                  step={1}
                  value={breakValue}
                  onChange={(event) => setBreakValue(Number(event.target.value))}
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 pr-12 text-sm outline-none transition focus:border-foreground focus:ring-3 focus:ring-primary/20"
                  disabled={isPending}
                  required
                />
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-muted-foreground">
                  min
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Presets:</span>
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                disabled={isPending}
                onClick={() => {
                  setFocusValue(preset.focus)
                  setBreakValue(preset.breakMinutes)
                }}
                className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary/60 hover:text-foreground"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isPending} onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Save
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
