import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { CalendarDays, PencilLine, Save, Trash2 } from "lucide-react"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getSupabaseClaims } from "@/lib/supabase/session"
import { parseTaskTags, formatTaskPriority, formatTaskStatus, TASK_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS } from "@/lib/tasks"

import { createTask, deleteTask, updateTask } from "./actions"

async function getTasksPageData() {
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient({
    getAll() {
      return cookieStore.getAll()
    },
  })

  const { data: claimsResult } = await getSupabaseClaims()

  if (!claimsResult?.claims?.sub) {
    redirect("/login")
  }

  const userId = claimsResult.claims.sub

  const [tasksResult] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, description, tags, due_date, priority, status, created_at")
      .eq("user_id", userId)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
  ])

  if (tasksResult.error) {
    throw new Error(tasksResult.error.message)
  }

  return {
    tasks: tasksResult.data ?? [],
  }
}

export default async function TasksPage() {
  const { tasks } = await getTasksPageData()

  const taskCounts = {
    total: tasks.length,
    todo: tasks.filter((task) => task.status === "todo").length,
    inProgress: tasks.filter((task) => task.status === "in_progress").length,
    done: tasks.filter((task) => task.status === "done").length,
  }

  return (
    <main className="space-y-6">
      <section className="rounded-[2rem] border border-border bg-card p-8 shadow-sm">
        <p className="text-sm font-semibold tracking-[0.25em] text-muted-foreground uppercase">
          Tasks
        </p>
        <h1 className="mt-4 text-3xl font-semibold">Your academic todo list</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Keep assignments, projects, and deadlines organized around your subjects.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-border p-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="mt-3 text-3xl font-semibold">{taskCounts.total}</p>
          </article>
          <article className="rounded-2xl border border-border p-4">
            <p className="text-sm text-muted-foreground">To do</p>
            <p className="mt-3 text-3xl font-semibold">{taskCounts.todo}</p>
          </article>
          <article className="rounded-2xl border border-border p-4">
            <p className="text-sm text-muted-foreground">In progress</p>
            <p className="mt-3 text-3xl font-semibold">{taskCounts.inProgress}</p>
          </article>
          <article className="rounded-2xl border border-border p-4">
            <p className="text-sm text-muted-foreground">Done</p>
            <p className="mt-3 text-3xl font-semibold">{taskCounts.done}</p>
          </article>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <form
          action={createTask}
          className="space-y-4 rounded-[2rem] border border-border bg-card p-6 shadow-sm"
        >
          <div>
            <h2 className="inline-flex items-center gap-2 text-xl font-semibold">
              <PencilLine className="size-4 text-muted-foreground" />
              New task
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add one academic task at a time and keep it focused.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="title">
              Task title
            </label>
            <input
              id="title"
              name="title"
              placeholder="Finish thesis chapter 1"
              className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-foreground"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              placeholder="Add notes or checklist items"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="tags">
              Tags
            </label>
            <input
              id="tags"
              name="tags"
              placeholder="thesis, sql, capstone"
              className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="due_date">
                Due date
              </label>
              <input
                id="due_date"
                name="due_date"
                type="date"
                className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-foreground"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="priority">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                defaultValue="medium"
                className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-foreground"
              >
                {TASK_PRIORITY_OPTIONS.map((priority) => (
                  <option key={priority} value={priority}>
                    {formatTaskPriority(priority)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="status">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue="todo"
              className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-foreground"
            >
              {TASK_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {formatTaskStatus(status)}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            <Save className="size-4" />
            Save task
          </button>
        </form>

        <section className="space-y-4 rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold">Tasks</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {tasks.length} task{tasks.length === 1 ? "" : "s"} found
            </p>
          </div>

          <div className="grid gap-4">
            {tasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-8 text-sm text-muted-foreground">
                No tasks yet. Add your first task on the left.
              </div>
            ) : (
              tasks.map((task) => {
                const tagList = Array.isArray(task.tags) ? task.tags : parseTaskTags(task.tags ?? "")

                return (
                  <article key={task.id} className="rounded-2xl border border-border p-4">
                    <form
                      action={updateTask}
                      className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1.8fr)_minmax(0,1.5fr)_minmax(8rem,9rem)_minmax(9rem,10rem)_auto]"
                    >
                      <input type="hidden" name="task_id" value={task.id} />

                      <div>
                        <label className="mb-2 block text-xs font-medium uppercase text-muted-foreground">
                          Task
                        </label>
                        <input
                          name="title"
                          defaultValue={task.title}
                          className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-foreground"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-medium uppercase text-muted-foreground">
                          Description
                        </label>
                        <input
                          name="description"
                          defaultValue={task.description ?? ""}
                          placeholder="Optional notes"
                          className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-foreground"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-medium uppercase text-muted-foreground">
                          Tags
                        </label>
                        <input
                          name="tags"
                          defaultValue={tagList.join(", ")}
                          placeholder="thesis, sql"
                          className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-foreground"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-medium uppercase text-muted-foreground">
                          Due date
                        </label>
                        <input
                          name="due_date"
                          type="date"
                          defaultValue={task.due_date ?? ""}
                          className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-foreground"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-medium uppercase text-muted-foreground">
                          Priority
                        </label>
                        <select
                          name="priority"
                          defaultValue={task.priority}
                          className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-foreground"
                        >
                          {TASK_PRIORITY_OPTIONS.map((priority) => (
                            <option key={priority} value={priority}>
                              {formatTaskPriority(priority)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-medium uppercase text-muted-foreground">
                          Status
                        </label>
                        <select
                          name="status"
                          defaultValue={task.status}
                          className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-foreground"
                        >
                          {TASK_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {formatTaskStatus(status)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-end gap-2">
                        <button
                          type="submit"
                          className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                        >
                          <Save className="size-4" />
                          Save
                        </button>
                      </div>
                    </form>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-border px-3 py-1 text-xs font-medium uppercase text-muted-foreground">
                          {formatTaskStatus(task.status)}
                        </span>
                        <span className="rounded-full border border-border px-3 py-1 text-xs font-medium uppercase text-muted-foreground">
                          {formatTaskPriority(task.priority)}
                        </span>
                        {tagList.length > 0 ? (
                          tagList.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground"
                            >
                              #{tag}
                            </span>
                          ))
                        ) : (
                          <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                            No tags
                          </span>
                        )}
                        {task.due_date ? (
                          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                            <CalendarDays className="size-4" />
                            {task.due_date}
                          </span>
                        ) : null}
                      </div>

                      <form action={deleteTask}>
                        <input type="hidden" name="task_id" value={task.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10"
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </button>
                      </form>
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </section>
      </section>
    </main>
  )
}
