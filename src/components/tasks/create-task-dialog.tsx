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
import { TaskFormFields, type TaskSubjectOption } from "@/components/tasks/task-form-fields"

type CreateTaskDialogProps = {
  onCreate: (formData: FormData) => Promise<void>
  subjects?: TaskSubjectOption[]
  trigger?: React.ReactNode
  /**
   * Pre-fills the due date field — used by planner-column quick-add so
   * clicking "+ Add task" under a specific date opens this same dialog with
   * that date already selected, instead of a second creation path.
   */
  initialDueDate?: string
  /**
   * Pre-fills (but doesn't lock) the Subject field — used by the Subject
   * Workspace's "+ Add Task" so the current subject is already selected.
   * The field stays a normal editable Select; the user can still change it.
   */
  initialSubjectId?: string
}

/**
 * Wraps the existing task creation fields in a dialog so the Tasks page no
 * longer permanently dedicates a column to the create form. The fields,
 * their names, and createTask itself are unchanged — this only owns the
 * open/pending/error UI state around the same submission.
 */
export function CreateTaskDialog({
  onCreate,
  subjects = [],
  trigger,
  initialDueDate,
  initialSubjectId,
}: CreateTaskDialogProps) {
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
        setError("Something went wrong creating this task. Please try again.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="size-4" />
            Add Task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-[min(42rem,calc(100vw-2rem))] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>Add one academic task at a time and keep it focused.</DialogDescription>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <TaskFormFields
            disabled={isPending}
            subjects={subjects}
            showRecurrence
            defaultValues={{ dueDate: initialDueDate, subjectId: initialSubjectId }}
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
                  Save task
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
