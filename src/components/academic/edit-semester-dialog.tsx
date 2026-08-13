"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

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
import { getSchoolYearStartOptions, TERM_OPTIONS, YEAR_LEVEL_OPTIONS } from "@/lib/semesters"

type EditSemesterDialogProps = {
  trigger: React.ReactNode
  initialYearLevel: number | null
  initialTerm: string | null
  initialSchoolYearStart: number | null
  currentYear: number
  onSave: (values: { yearLevel: number; term: string; schoolYearStart: number }) => Promise<void>
}

/**
 * Structured editor for a semester's year level, term, and school year.
 * The actual mutation is supplied by the caller (the existing
 * updateSemester Server Action) — this component only owns the
 * open/pending/error/form-value UI state around it.
 *
 * Legacy (pre-Sprint-3.6) semesters have null year_level/term/
 * school_year_start, so this dialog falls back to sensible defaults
 * (Year 1, 1st Semester, the current year) rather than leaving the form
 * blank — saving converts the semester to the structured model.
 */
export function EditSemesterDialog({
  trigger,
  initialYearLevel,
  initialTerm,
  initialSchoolYearStart,
  currentYear,
  onSave,
}: EditSemesterDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [yearLevel, setYearLevel] = React.useState(initialYearLevel ?? 1)
  const [term, setTerm] = React.useState(initialTerm ?? "1")
  const [schoolYearStart, setSchoolYearStart] = React.useState(initialSchoolYearStart ?? currentYear)
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()
  const schoolYearOptions = React.useMemo(
    () => getSchoolYearStartOptions(currentYear),
    [currentYear],
  )

  function handleOpenChange(next: boolean) {
    if (isPending) {
      return
    }

    if (next) {
      setYearLevel(initialYearLevel ?? 1)
      setTerm(initialTerm ?? "1")
      setSchoolYearStart(initialSchoolYearStart ?? currentYear)
      setError(null)
    }

    setOpen(next)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError(null)
    startTransition(async () => {
      try {
        await onSave({ yearLevel, term, schoolYearStart })
        setOpen(false)
      } catch {
        setError("Something went wrong saving this semester. Please try again.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit semester</DialogTitle>
          <DialogDescription>Update the year level, term, and school year.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="edit-semester-year-level">
              Year Level
            </label>
            <select
              id="edit-semester-year-level"
              value={yearLevel}
              onChange={(event) => setYearLevel(Number(event.target.value))}
              className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-foreground"
              disabled={isPending}
              required
            >
              {YEAR_LEVEL_OPTIONS.map((year) => (
                <option key={year} value={year}>
                  Year {year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="edit-semester-term">
              Semester
            </label>
            <select
              id="edit-semester-term"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-foreground"
              disabled={isPending}
              required
            >
              {TERM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="edit-semester-school-year-start">
              School Year
            </label>
            <div className="flex items-center gap-3">
              <select
                id="edit-semester-school-year-start"
                value={schoolYearStart}
                onChange={(event) => setSchoolYearStart(Number(event.target.value))}
                className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-foreground"
                disabled={isPending}
                required
              >
                {schoolYearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <span className="shrink-0 text-sm text-muted-foreground">– {schoolYearStart + 1}</span>
            </div>
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
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
