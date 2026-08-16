"use client"

import * as React from "react"
import { Loader2, Plus, Save } from "lucide-react"

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

type CreateSemesterDialogProps = {
  onCreate: (formData: FormData) => Promise<void>
  currentYear: number
  trigger?: React.ReactNode
}

/**
 * Wraps the structured semester creation fields (year level, term, school
 * year) in a dialog so the Semesters page no longer permanently dedicates a
 * column to the create form. createSemester itself is unchanged.
 *
 * `currentYear` is computed once by the Server Component page and passed in
 * as a prop — it is never derived from `new Date()` inside this Client
 * Component, so the school-year option list is identical on the server
 * render and the first client render.
 */
export function CreateSemesterDialog({ onCreate, currentYear, trigger }: CreateSemesterDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [schoolYearStart, setSchoolYearStart] = React.useState(currentYear)
  const [isPending, startTransition] = React.useTransition()
  const formRef = React.useRef<HTMLFormElement>(null)
  const schoolYearOptions = React.useMemo(() => getSchoolYearStartOptions(currentYear), [currentYear])

  function handleOpenChange(next: boolean) {
    if (isPending) {
      return
    }

    setOpen(next)

    if (!next) {
      setError(null)
      setSchoolYearStart(currentYear)
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)

    setError(null)
    startTransition(async () => {
      try {
        await onCreate(formData)
        formRef.current?.reset()
        setSchoolYearStart(currentYear)
        setOpen(false)
      } catch {
        setError("Something went wrong creating this semester. Please try again.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="size-4" />
            Add Semester
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New semester</DialogTitle>
          <DialogDescription>Pick the year level, term, and school year.</DialogDescription>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="year_level">
              Year Level
            </label>
            <select
              id="year_level"
              name="year_level"
              defaultValue={1}
              className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-foreground focus:ring-3 focus:ring-primary/20"
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
            <label className="mb-2 block text-sm font-medium" htmlFor="term">
              Semester
            </label>
            <select
              id="term"
              name="term"
              defaultValue="1"
              className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-foreground focus:ring-3 focus:ring-primary/20"
              disabled={isPending}
              required
            >
              {TERM_OPTIONS.map((term) => (
                <option key={term.value} value={term.value}>
                  {term.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="school_year_start">
              School Year
            </label>
            <div className="flex items-center gap-3">
              <select
                id="school_year_start"
                name="school_year_start"
                value={schoolYearStart}
                onChange={(event) => setSchoolYearStart(Number(event.target.value))}
                className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-foreground focus:ring-3 focus:ring-primary/20"
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
                <>
                  <Save className="size-4" />
                  Save semester
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
