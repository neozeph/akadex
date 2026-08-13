import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Search, X } from "lucide-react"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/supabase/session"
import { formatTaskStatus, TASK_STATUS_OPTIONS } from "@/lib/tasks"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { TaskBoard } from "@/components/tasks/task-board"
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog"

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

/**
 * Local calendar date as YYYY-MM-DD, computed once on the server per
 * request and passed down as a plain string prop. TaskBoard/TaskCard only
 * ever compare due_date strings against this value — they never call
 * `Date` themselves — so the date-grouping UI can't diverge between the
 * server render and the first client render.
 */
function toISODate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

async function getTasksPageData(searchParams: TasksSearchParams) {
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient({
    getAll() {
      return cookieStore.getAll()
    },
  })

  const user = await getAuthenticatedUser()

  if (!user) {
    redirect("/login")
  }

  const userId = user.id

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

  const now = new Date()
  const todayISO = toISODate(now)
  const tomorrowISO = toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))

  return (
    <main className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Manage your academic and personal tasks."
        action={<CreateTaskDialog onCreate={createTask} />}
      />

      <section className="rounded-[2rem] border border-border bg-card p-4 shadow-sm">
        <div className="space-y-4">
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

      <TaskBoard
        tasks={tasks}
        hasActiveFilters={activeFilterCount > 0}
        todayISO={todayISO}
        tomorrowISO={tomorrowISO}
        onDeleteTask={deleteTask}
        onUpdateTask={updateTask}
        onSetTaskCompletion={setTaskCompletion}
      />
    </main>
  )
}
