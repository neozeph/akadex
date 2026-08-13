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
import { GRADE_OPTIONS } from "@/lib/grades"

type CreateSubjectDialogProps = {
  semesterId: string
  onCreate: (formData: FormData) => Promise<void>
}

/**
 * Wraps the existing subject creation fields in a dialog so the semester
 * detail page no longer permanently dedicates a column to the create form.
 * The fields, their names, and createSubject itself are unchanged.
 */
export function CreateSubjectDialog({ semesterId, onCreate }: CreateSubjectDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()
  const formRef = React.useRef<HTMLFormElement>(null)

  function handleOpenChange(next: boolean) {
    if (isPending) {
      return
    }

    setOpen(next)

    if (!next) {
      setError(null)
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
        setOpen(false)
      } catch {
        setError("Something went wrong adding this subject. Please try again.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Add Subject
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add subject</DialogTitle>
          <DialogDescription>Start with the classes that matter most this term.</DialogDescription>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="semester_id" value={semesterId} />

          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="subject_code">
              Subject code
            </label>
            <input
              id="subject_code"
              name="subject_code"
              placeholder="CS101"
              className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm font-mono uppercase outline-none transition focus:border-foreground"
              disabled={isPending}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="subject_name">
              Subject name
            </label>
            <input
              id="subject_name"
              name="subject_name"
              placeholder="Introduction to Programming"
              className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-foreground"
              disabled={isPending}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="units">
                Units
              </label>
              <input
                id="units"
                name="units"
                type="number"
                step="0.5"
                min="0.5"
                max="10"
                placeholder="3"
                className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-foreground"
                disabled={isPending}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="grade">
                Grade
              </label>
              <select
                id="grade"
                name="grade"
                defaultValue=""
                className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-foreground"
                disabled={isPending}
              >
                <option value="">No grade yet</option>
                {GRADE_OPTIONS.map((grade) => (
                  <option key={grade} value={grade.toFixed(2)}>
                    {grade.toFixed(2)}
                  </option>
                ))}
              </select>
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
                  Save subject
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
