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
import { TaskFormFields, type TaskSubjectOption } from "@/components/tasks/task-form-fields"

type EditTaskDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: {
    id: string
    title: string
    description: string | null
    tags: string[] | null
    due_date: string | null
    priority: string
    status: string
    subject_id: string | null
    series_id: string | null
  }
  subjects: TaskSubjectOption[]
  onSave: (formData: FormData) => Promise<void>
}

/**
 * Replaces the old hand-built fixed-overlay task editor with the same
 * Dialog primitive/pattern used everywhere else (the create and delete
 * dialogs), for consistent focus-trap, Escape, and aria behavior. Reuses
 * the unmodified updateTask Server Action — no mutation logic was moved
 * client-side.
 *
 * Open state is controlled by the parent (TaskCard) rather than owned
 * here, since only one task is being edited at a time and the trigger
 * (the card itself) lives outside this component's own markup.
 */
export function EditTaskDialog({ open, onOpenChange, task, subjects, onSave }: EditTaskDialogProps) {
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
        setError("Something went wrong saving this task. Please try again.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[min(42rem,calc(100vw-2rem))] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
          <DialogDescription>Update the details for this task.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="task_id" value={task.id} />

          {task.series_id ? (
            <p className="rounded-xl border border-border bg-muted px-4 py-3 text-xs text-muted-foreground">
              Part of a recurring series — changes here only affect this occurrence.
            </p>
          ) : null}

          <TaskFormFields
            disabled={isPending}
            subjects={subjects}
            defaultValues={{
              title: task.title,
              description: task.description ?? "",
              tags: Array.isArray(task.tags) ? task.tags.join(", ") : "",
              dueDate: task.due_date ?? "",
              priority: task.priority,
              status: task.status,
              subjectId: task.subject_id ?? "",
            }}
          />

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
