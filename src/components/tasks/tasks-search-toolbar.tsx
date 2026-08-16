"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, X } from "lucide-react"

import { formatTaskPriority, formatTaskStatus, TASK_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS } from "@/lib/tasks"
import { Button } from "@/components/ui/button"
import type { TasksSearchParams } from "@/app/(dashboard)/tasks/data"

type TasksSearchToolbarProps = {
  searchParams: TasksSearchParams
  subjects: Array<{ id: string; code: string }>
  hasActiveFilters: boolean
}

/**
 * Builds a status-chip href that keeps whatever's already in the URL (q,
 * subject, priority) and only changes `status` — omitting it entirely for
 * the "Active" chip, which is the default (no status param) view.
 */
function buildStatusHref(current: TasksSearchParams, status?: string) {
  const query: Record<string, string> = {}

  if (current.q?.trim()) query.q = current.q.trim()
  if (current.subject) query.subject = current.subject
  if (current.priority) query.priority = current.priority
  if (status) query.status = status

  return Object.keys(query).length > 0 ? { pathname: "/tasks", query } : "/tasks"
}

/**
 * Client-side replacement for the old native `<form method="get">` search
 * bar. That form's submission was a full browser navigation — the entire
 * document (React tree, ThemeProvider included) reloaded from scratch, and
 * since the theme class is only applied client-side after mount, the fresh
 * load briefly painted the default (light) theme before flipping to the
 * stored one. `router.push` is a client-side transition instead: the root
 * layout and ThemeProvider never unmount, so the applied theme class simply
 * carries over — no flash, no theme-provider changes needed.
 *
 * Search state stays in the URL (still shareable/bookmarkable, e.g.
 * `/tasks?q=database`) — this only changes how the navigation happens, not
 * where the filter state lives.
 *
 * Status chips (Active/To Do/In Progress/Done) live in this same component
 * — and the same flex-wrap row — as the search/subject/priority controls,
 * as one compact toolbar rather than a separate filter section underneath.
 * They're plain `next/link`s nested inside the `<form>`; that's valid (a
 * form can contain non-form content) and they don't trigger submission
 * since they render as `<a>`, not `<button>`.
 */
export function TasksSearchToolbar({ searchParams, subjects, hasActiveFilters }: TasksSearchToolbarProps) {
  const router = useRouter()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const params = new URLSearchParams()

    // This form doesn't own `status` (the chips below do) — carry whatever
    // is already in the URL forward instead of dropping it.
    if (searchParams.status) {
      params.set("status", searchParams.status)
    }

    const q = String(formData.get("q") ?? "").trim()
    const subject = String(formData.get("subject") ?? "")
    const priority = String(formData.get("priority") ?? "")

    if (q) params.set("q", q)
    if (subject) params.set("subject", subject)
    if (priority) params.set("priority", priority)

    const query = params.toString()
    router.push(query ? `/tasks?${query}` : "/tasks")
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-56">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          name="q"
          defaultValue={searchParams.q ?? ""}
          placeholder="Search tasks..."
          className="h-9 w-full rounded-xl border border-border bg-background px-4 pl-10 text-sm outline-none transition focus:border-foreground focus:ring-3 focus:ring-primary/20"
        />
      </div>

      <label className="sr-only" htmlFor="subject-filter">
        Filter by subject
      </label>
      <select
        id="subject-filter"
        name="subject"
        defaultValue={searchParams.subject ?? ""}
        className="h-9 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-foreground focus:ring-3 focus:ring-primary/20 sm:w-36"
      >
        <option value="">All Subjects</option>
        {subjects.map((subject) => (
          <option key={subject.id} value={subject.id}>
            {subject.code}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="priority-filter">
        Filter by priority
      </label>
      <select
        id="priority-filter"
        name="priority"
        defaultValue={searchParams.priority ?? ""}
        className="h-9 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-foreground focus:ring-3 focus:ring-primary/20 sm:w-32"
      >
        <option value="">All Priorities</option>
        {TASK_PRIORITY_OPTIONS.map((priority) => (
          <option key={priority} value={priority}>
            {formatTaskPriority(priority)}
          </option>
        ))}
      </select>

      <div className="flex flex-wrap items-center gap-1.5">
        <Button asChild variant={!searchParams.status ? "default" : "outline"} size="sm">
          <Link href={buildStatusHref(searchParams)}>Active</Link>
        </Button>
        {TASK_STATUS_OPTIONS.map((status) => (
          <Button key={status} asChild variant={searchParams.status === status ? "default" : "outline"} size="sm">
            <Link href={buildStatusHref(searchParams, status)}>{formatTaskStatus(status)}</Link>
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <Button type="submit" variant="outline" size="sm">
          Search
        </Button>
        {hasActiveFilters ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => router.push("/tasks")}>
            <X className="size-4" />
            Clear
          </Button>
        ) : null}
      </div>
    </form>
  )
}
