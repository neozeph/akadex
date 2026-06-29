"use client"

import { useState } from "react"
import { CalendarDays, Check, PencilLine, Tag, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type TaskRecord = {
  id: string
  title: string
  description: string | null
  tags: string[] | null
  due_date: string | null
  priority: string
  status: string
}

type TaskBoardProps = {
  tasks: TaskRecord[]
  onDeleteTask: (formData: FormData) => Promise<void>
  onUpdateTask: (formData: FormData) => Promise<void>
  onSetTaskCompletion: (formData: FormData) => Promise<void>
}

function normalizeTags(tags: string[] | null) {
  return Array.isArray(tags) ? tags : []
}

export function TaskBoard({
  tasks,
  onDeleteTask,
  onUpdateTask,
  onSetTaskCompletion,
}: TaskBoardProps) {
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null)

  return (
    <>
      <section className="space-y-4 rounded-[2rem] border border-border/60 bg-card/70 p-6 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Tasks</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Click a task to edit details. Use the checkbox to mark it complete.
            </p>
          </div>
          <div className="hidden rounded-full border border-border/60 bg-background/50 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur md:block">
            Todoist-style list
          </div>
        </div>

        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-background/40 p-8 text-sm text-muted-foreground backdrop-blur dark:bg-white/5">
              No tasks match your search or filters. Try a different title, tag, or clear the
              filters above.
            </div>
          ) : (
            tasks.map((task) => {
              const tagList = normalizeTags(task.tags)
              const isDone = task.status === "done"

              return (
                <article
                  key={task.id}
                  className={cn(
                    "group rounded-[1.4rem] border border-border/60 bg-background/55 p-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.35)] backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-background/70 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/8",
                    isDone && "opacity-80",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <form action={onSetTaskCompletion} className="pt-0.5">
                      <input type="hidden" name="task_id" value={task.id} />
                      <input type="hidden" name="completed" value={String(!isDone)} />
                      <label className="group/checkbox flex cursor-pointer items-center justify-center">
                        <input
                          type="checkbox"
                          defaultChecked={isDone}
                          aria-label={`Mark ${task.title} as ${isDone ? "not done" : "done"}`}
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
                        <span className="flex size-6 items-center justify-center rounded-full border border-border/70 bg-background text-transparent transition peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground dark:bg-white/5">
                          <Check className="size-3.5" />
                        </span>
                      </label>
                    </form>

                    <button
                      type="button"
                      onClick={() => setSelectedTask(task)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={cn("font-semibold transition", isDone && "text-muted-foreground line-through")}>
                          {task.title}
                        </h3>
                        <span className="rounded-full border border-border/60 px-2.5 py-0.5 text-[0.72rem] font-medium uppercase tracking-wide text-muted-foreground">
                          {task.status.replace("_", " ")}
                        </span>
                        <span className="rounded-full border border-border/60 px-2.5 py-0.5 text-[0.72rem] font-medium uppercase tracking-wide text-muted-foreground">
                          {task.priority}
                        </span>
                      </div>

                      {task.description ? (
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                          {task.description}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground">
                          No description yet. Open the task to add one.
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {tagList.length > 0 ? (
                          tagList.slice(0, 4).map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-xs font-medium text-muted-foreground"
                            >
                              <Tag className="size-3" />
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="rounded-full border border-border/60 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                            No tags
                          </span>
                        )}

                        {task.due_date ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                            <CalendarDays className="size-3" />
                            {task.due_date}
                          </span>
                        ) : null}
                      </div>
                    </button>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="opacity-0 transition group-hover:opacity-100"
                        onClick={() => setSelectedTask(task)}
                        aria-label={`Edit ${task.title}`}
                      >
                        <PencilLine className="size-4" />
                      </Button>
                      <form action={onDeleteTask}>
                        <input type="hidden" name="task_id" value={task.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon-sm"
                          className="opacity-0 text-destructive transition group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Delete ${task.title}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </form>
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </div>
      </section>

      {selectedTask ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setSelectedTask(null)} />

          <div className="relative w-full max-w-2xl rounded-[2rem] border border-border/60 bg-background p-6 shadow-[0_30px_90px_-34px_rgba(15,23,42,0.65)] dark:border-white/10 dark:bg-[color-mix(in_oklch,var(--background)_88%,white_12%)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted-foreground">
                  Edit task
                </p>
                <h3 className="mt-2 text-2xl font-semibold">{selectedTask.title}</h3>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setSelectedTask(null)}
                aria-label="Close editor"
              >
                <X className="size-4" />
              </Button>
            </div>

            <form
              action={onUpdateTask}
              className="mt-6 space-y-4"
              onSubmit={() => setSelectedTask(null)}
            >
              <input type="hidden" name="task_id" value={selectedTask.id} />

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium" htmlFor={`title-${selectedTask.id}`}>
                    Task title
                  </label>
                  <input
                    id={`title-${selectedTask.id}`}
                    name="title"
                    defaultValue={selectedTask.title}
                    className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-foreground"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium" htmlFor={`status-${selectedTask.id}`}>
                    Status
                  </label>
                  <select
                    id={`status-${selectedTask.id}`}
                    name="status"
                    defaultValue={selectedTask.status}
                    className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-foreground"
                  >
                    <option value="todo">Todo</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor={`description-${selectedTask.id}`}>
                  Description
                </label>
                <textarea
                  id={`description-${selectedTask.id}`}
                  name="description"
                  rows={4}
                  defaultValue={selectedTask.description ?? ""}
                  placeholder="Add notes or checklist items"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium" htmlFor={`tags-${selectedTask.id}`}>
                    Tags
                  </label>
                  <input
                    id={`tags-${selectedTask.id}`}
                    name="tags"
                    defaultValue={normalizeTags(selectedTask.tags).join(", ")}
                    placeholder="thesis, sql"
                    className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-foreground"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium" htmlFor={`due-${selectedTask.id}`}>
                    Due date
                  </label>
                  <input
                    id={`due-${selectedTask.id}`}
                    name="due_date"
                    type="date"
                    defaultValue={selectedTask.due_date ?? ""}
                    className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-foreground"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium" htmlFor={`priority-${selectedTask.id}`}>
                    Priority
                  </label>
                  <select
                    id={`priority-${selectedTask.id}`}
                    name="priority"
                    defaultValue={selectedTask.priority}
                    className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-foreground"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setSelectedTask(null)}>
                  Cancel
                </Button>
                <Button type="submit" className="gap-2">
                  <Check className="size-4" />
                  Save changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}
