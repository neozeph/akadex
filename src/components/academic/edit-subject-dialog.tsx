"use client"

import * as React from "react"
import { Loader2, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { GRADE_OPTIONS } from "@/lib/grades"

export type EditableSubject = {
  id: string
  subject_code: string
  subject_name: string
  units: number | string
  grade: number | null
}

type EditSubjectDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  semesterId: string
  subject: EditableSubject
  onSave: (formData: FormData) => Promise<void>
}

/**
 * Same pattern as EditTaskDialog: open state is owned by the caller
 * (SubjectCard, so clicking the card opens this) and the fields/names are
 * identical to CreateSubjectDialog so the existing updateSubject Server
 * Action needs no changes.
 */
export function EditSubjectDialog({ open, onOpenChange, semesterId, subject, onSave }: EditSubjectDialogProps) {
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()

  function handleOpenChange(next: boolean) {
    if (isPending) {
      return
    }

    if (!next) {
      setError(null)
    }

    onOpenChange(next)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)

    setError(null)
    startTransition(async () => {
      try {
        await onSave(formData)
        onOpenChange(false)
      } catch {
        setError("Something went wrong saving this subject. Please try again.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit subject</DialogTitle>
          <DialogDescription>Update the code, name, units, or grade.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="semester_id" value={semesterId} />
          <input type="hidden" name="subject_id" value={subject.id} />

          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="edit-subject-code">
              Subject code
            </label>
            <input
              id="edit-subject-code"
              name="subject_code"
              defaultValue={subject.subject_code}
              className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm font-mono uppercase outline-none transition focus:border-foreground"
              disabled={isPending}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="edit-subject-name">
              Subject name
            </label>
            <input
              id="edit-subject-name"
              name="subject_name"
              defaultValue={subject.subject_name}
              className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-foreground"
              disabled={isPending}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="edit-subject-units">
                Units
              </label>
              <input
                id="edit-subject-units"
                name="units"
                type="number"
                step="0.5"
                min="0.5"
                max="10"
                defaultValue={subject.units}
                className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-foreground"
                disabled={isPending}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="edit-subject-grade">
                Grade
              </label>
              <select
                id="edit-subject-grade"
                name="grade"
                defaultValue={subject.grade === null ? "" : subject.grade.toFixed(2)}
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
                  Save changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
