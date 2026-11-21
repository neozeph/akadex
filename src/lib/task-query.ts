import { TASK_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS } from "@/lib/tasks"

export const TASK_PAGE_SIZE = 50
export type TaskFilters = { q: string; status: string; subject: string; priority: string }
export type TasksSearchParams = { q?: unknown; status?: unknown; subject?: unknown; priority?: unknown; page?: unknown }

export function parseTaskQuery(input: TasksSearchParams) {
  let invalid = false
  const scalar = (value: unknown) => {
    if (value === undefined || value === "") return ""
    if (typeof value !== "string") { invalid = true; return "" }
    return value.trim()
  }
  let q = scalar(input.q), status = scalar(input.status), priority = scalar(input.priority), subject = scalar(input.subject)
  if (q.length > 200) { q = ""; invalid = true }
  if (status && !TASK_STATUS_OPTIONS.includes(status as typeof TASK_STATUS_OPTIONS[number])) { status = ""; invalid = true }
  if (priority && !TASK_PRIORITY_OPTIONS.includes(priority as typeof TASK_PRIORITY_OPTIONS[number])) { priority = ""; invalid = true }
  if (subject && !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(subject)) { subject = ""; invalid = true }
  const pageValue = scalar(input.page)
  let page = pageValue ? Number(pageValue) : 1
  if (pageValue && (!/^\d+$/.test(pageValue) || !Number.isSafeInteger(page) || page < 1 || page > Math.floor((Number.MAX_SAFE_INTEGER - TASK_PAGE_SIZE) / TASK_PAGE_SIZE))) { page = 1; invalid = true }
  return { filters: { q, status, subject, priority }, page, invalid }
}

export function taskPageHref(filters: TaskFilters, page: number) {
  const params = new URLSearchParams()
  for (const key of ["q", "status", "subject", "priority"] as const) if (filters[key]) params.set(key, filters[key])
  if (page > 1) params.set("page", String(page))
  return params.size ? `/tasks?${params}` : "/tasks"
}

