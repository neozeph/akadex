import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { PencilLine, Save, Search, X } from "lucide-react"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getSupabaseClaims } from "@/lib/supabase/session"
import {
  formatTaskPriority,
  formatTaskStatus,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
} from "@/lib/tasks"
import { Button } from "@/components/ui/button"
import { TaskBoard } from "@/components/tasks/task-board"

import { createTask, deleteTask, setTaskCompletion, updateTask } from "./actions"

type TasksSearchParams = {
  q?: string
  status?: string
  tag?: string
}

function buildTasksHref(current: TasksSearchParams, next: Partial<TasksSearchParams> = {}) {
  const query = {
    ...current,
    ...next,
  }

  const cleanedQuery = Object.fromEntries(
    Object.entries(query).filter(([, value]) => typeof value === "string" && value.trim().length > 0),
  )

  return Object.keys(cleanedQuery).length > 0 ? { pathname: "/tasks", query: cleanedQuery } : "/tasks"
}

async function getTasksPageData(searchParams: TasksSearchParams) {
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

  const allTasks = tasksResult.data ?? []
  const searchTerm = searchParams.q?.trim().toLowerCase() ?? ""
  const filteredTasks = allTasks.filter((task) => {
    const titleMatches = !searchTerm || task.title.toLowerCase().includes(searchTerm)
    const tagMatchesBySearch =
      !searchTerm ||
      (Array.isArray(task.tags) &&
        task.tags.some((tag) => tag.toLowerCase().includes(searchTerm)))
    const statusMatches = !searchParams.status || task.status === searchParams.status
    const tagMatches =
      !searchParams.tag ||
      (Array.isArray(task.tags) && task.tags.includes(searchParams.tag.toLowerCase()))

    return titleMatches && tagMatchesBySearch && statusMatches && tagMatches
  })

  return {
    allTasks,
    tasks: filteredTasks,
  }
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<TasksSearchParams>
}) {
  const resolvedSearchParams = await searchParams
  const { allTasks, tasks } = await getTasksPageData(resolvedSearchParams)
  const activeFilterCount = [
    resolvedSearchParams.q?.trim(),
    resolvedSearchParams.status,
    resolvedSearchParams.tag,
  ].filter(Boolean).length
  const uniqueTags = Array.from(
    new Set(allTasks.flatMap((task) => (Array.isArray(task.tags) ? task.tags : []))),
  ).sort()

  const taskCounts = {
    total: allTasks.length,
    todo: allTasks.filter((task) => task.status === "todo").length,
    inProgress: allTasks.filter((task) => task.status === "in_progress").length,
    done: allTasks.filter((task) => task.status === "done").length,
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

        <div className="mt-6 space-y-4">
          <form action="/tasks" method="get" className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                name="q"
                defaultValue={resolvedSearchParams.q ?? ""}
                placeholder="Search by title or tag"
                className="h-11 w-full rounded-xl border border-border bg-background px-4 pl-11 text-sm outline-none transition focus:border-foreground"
              />
              {resolvedSearchParams.status ? (
                <input type="hidden" name="status" value={resolvedSearchParams.status} />
              ) : null}
              {resolvedSearchParams.tag ? <input type="hidden" name="tag" value={resolvedSearchParams.tag} /> : null}
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" variant="outline" className="w-full lg:w-auto">
                Search
              </Button>
              {activeFilterCount > 0 ? (
                <Button asChild variant="ghost" className="w-full lg:w-auto">
                  <Link href="/tasks">
                    <X className="size-4" />
                    Clear filters
                  </Link>
                </Button>
              ) : null}
            </div>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border px-3 py-1 text-xs font-medium uppercase text-muted-foreground">
              {activeFilterCount} active filter{activeFilterCount === 1 ? "" : "s"}
            </span>
            <Button
              asChild
              variant={!resolvedSearchParams.status && !resolvedSearchParams.tag ? "default" : "outline"}
              size="sm"
            >
              <Link href="/tasks">All</Link>
            </Button>
            {TASK_STATUS_OPTIONS.map((status) => (
              <Button
                key={status}
                asChild
                variant={resolvedSearchParams.status === status ? "default" : "outline"}
                size="sm"
              >
                <Link href={buildTasksHref(resolvedSearchParams, { status })}>
                  {formatTaskStatus(status)}
                </Link>
              </Button>
            ))}
            {uniqueTags.slice(0, 8).map((tag) => (
              <Button
                key={tag}
                asChild
                variant={resolvedSearchParams.tag === tag ? "default" : "outline"}
                size="sm"
              >
                <Link href={buildTasksHref(resolvedSearchParams, { tag })}>#{tag}</Link>
              </Button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <form
          action={createTask}
          className="space-y-4 rounded-[2rem] border border-border/60 bg-card/70 p-6 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
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

        <TaskBoard
          tasks={tasks}
          onDeleteTask={deleteTask}
          onUpdateTask={updateTask}
          onSetTaskCompletion={setTaskCompletion}
        />
      </section>
    </main>
  )
}
