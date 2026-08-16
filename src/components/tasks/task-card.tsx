"use client"

import * as React from "react"
import { Check, Trash2 } from "lucide-react"

import { EditTaskDialog } from "@/components/tasks/edit-task-dialog"
import { DeleteConfirmDialog } from "@/components/academic/delete-confirm-dialog"
import { type TaskSubjectOption } from "@/components/tasks/task-form-fields"
import { getTaskPriorityStyles } from "@/lib/tasks"
import { cn } from "@/lib/utils"

export type TaskRecord = {
  id: string
  title: string
  description: string | null
  tags: string[] | null
  due_date: string | null
  priority: string
  status: string
  subject_id: string | null
  series_id: string | null
  subject: { subject_code: string; subject_name: string } | null
}

type TaskCardProps = {
  task: TaskRecord
  subjects: TaskSubjectOption[]
  onUpdateTask: (formData: FormData) => Promise<void>
  onDeleteTask: (formData: FormData) => Promise<void>
  onSetTaskCompletion: (formData: FormData) => Promise<void>
  /**
   * Opt-in subtle due-date text (e.g. "Overdue", "Today", "Aug 14").
   * Planner columns already imply the date via their header, so they never
   * pass this; contexts that show a flat, non-grouped list (the Subject
   * Workspace) do, since the ordering wouldn't otherwise be legible.
   */
  dueDateLabel?: string | null
}

export function TaskCard({
  task,
  subjects,
  onUpdateTask,
  onDeleteTask,
  onSetTaskCompletion,
  dueDateLabel,
}: TaskCardProps) {
  const [editOpen, setEditOpen] = React.useState(false)
  const isDone = task.status === "done"
  const priorityStyle = getTaskPriorityStyles(task.priority)

  return (
    <>
      <article
        className={cn(
          "group relative rounded-lg border bg-card p-2.5 pr-8 shadow-sm transition-colors duration-200 hover:bg-accent/40 hover:shadow-md",
          isDone ? "opacity-60 border-border" : priorityStyle.border,
        )}
      >
        <div className="flex items-start gap-1.5">
          <form action={onSetTaskCompletion}>
            <input type="hidden" name="task_id" value={task.id} />
            <input type="hidden" name="completed" value={String(!isDone)} />
            <label className="relative mt-0.5 flex size-5 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition before:absolute before:-inset-2.5 before:content-[''] hover:bg-accent hover:text-primary">
              <input
                type="checkbox"
                defaultChecked={isDone}
                aria-label={`Mark ${task.title} as ${isDone ? "incomplete" : "complete"}`}
                className="peer sr-only"
                onChange={(event) => {
                  const form = event.currentTarget.form
                  if (!form) return

                  const completedField = form.elements.namedItem("completed")
                  if (completedField instanceof HTMLInputElement) {
                    completedField.value = event.currentTarget.checked ? "true" : "false"
                  }

                  form.requestSubmit()
                }}
              />
              <span className="flex size-3.5 items-center justify-center rounded-full border border-border bg-background text-transparent transition peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground">
                <Check className="size-2.5" />
              </span>
            </label>
          </form>

          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="min-w-0 flex-1 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Edit ${task.title}${task.description ? `: ${task.description}` : ""}`}
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-1.5">
              <h3
                className={cn(
                  "line-clamp-2 min-w-0 break-words text-sm font-semibold leading-5 text-foreground",
                  isDone && "text-muted-foreground line-through",
                )}
              >
                {task.title}
              </h3>
              <span
                className={cn(
                  "shrink-0 text-[0.68rem] font-semibold uppercase tracking-wide",
                  isDone ? "text-muted-foreground" : priorityStyle.label,
                )}
              >
                {task.priority}
              </span>
            </div>

            {task.description ? (
              <p className="mt-0.5 line-clamp-2 break-words text-xs leading-5 text-muted-foreground">{task.description}</p>
            ) : null}

            {task.subject ? (
              <p className="mt-0.5 truncate text-[0.68rem] font-medium text-muted-foreground">
                {task.subject.subject_code} · {task.subject.subject_name}
              </p>
            ) : null}

            {dueDateLabel ? (
              <p
                className={cn(
                  "mt-0.5 text-[0.68rem] font-medium",
                  dueDateLabel === "Overdue" ? "text-terracotta" : "text-muted-foreground",
                )}
              >
                {dueDateLabel}
              </p>
            ) : null}
          </button>

          <div className="absolute right-1.5 top-1.5 flex shrink-0 items-center rounded-md bg-card/90 opacity-100 backdrop-blur-sm transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            <DeleteConfirmDialog
              trigger={
                <button
                  type="button"
                  aria-label={`Delete ${task.title}`}
                  className="relative flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors before:absolute before:-inset-2 before:content-[''] hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Trash2 className="size-3.5" />
                </button>
              }
              title={`Delete "${task.title}"?`}
              description="This task will be permanently deleted. This action cannot be undone."
              confirmLabel="Delete task"
              pendingLabel="Deleting..."
              errorMessage="Something went wrong deleting this task. Please try again."
              onConfirm={async () => {
                const formData = new FormData()
                formData.set("task_id", task.id)
                await onDeleteTask(formData)
              }}
            />
          </div>
        </div>
      </article>

      <EditTaskDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        task={task}
        subjects={subjects}
        onSave={onUpdateTask}
      />
    </>
  )
}
