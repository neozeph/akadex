import "server-only"
import type { createSupabaseServerClient } from "@/lib/supabase/server"
import type { TaskRecord } from "@/components/tasks/task-card"
import { TASK_PAGE_SIZE, type TaskFilters } from "@/lib/task-query"
import { throwPublicError } from "@/lib/server-errors"
import { measureOperation } from "@/lib/performance"

type RawTask = Omit<TaskRecord, "subject" | "recurrence_type"> & {
  created_at: string
  subject: TaskRecord["subject"] | NonNullable<TaskRecord["subject"]>[]
  series: { recurrence_type: NonNullable<TaskRecord["recurrence_type"]> } | { recurrence_type: NonNullable<TaskRecord["recurrence_type"]> }[] | null
}

export function queryTaskPage(supabase: ReturnType<typeof createSupabaseServerClient>, filters: TaskFilters, page: number, signal?: AbortSignal) {
  return measureOperation("task-page", () => readTaskPage(supabase, filters, page, signal))
}
async function readTaskPage(supabase: ReturnType<typeof createSupabaseServerClient>, filters: TaskFilters, page: number, signal?: AbortSignal) {
  const offset = (page - 1) * TASK_PAGE_SIZE
  let query = supabase.rpc("search_tasks", {
    p_search: filters.q,
    p_status: filters.status || undefined,
    p_subject: filters.subject || undefined,
    p_priority: filters.priority || undefined,
  }, { get: true })
    .select("id, title, description, tags, due_date, priority, status, subject_id, series_id, created_at, subject:subjects(subject_code, subject_name), series:task_series(recurrence_type)")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false }).order("id", { ascending: true })
    .range(offset, offset + TASK_PAGE_SIZE)
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query.overrideTypes<RawTask[], { merge: false }>()
  if (error?.code === "PGRST103" && page > 1) return { tasks: [], hasNext: false }
  if (error || !Array.isArray(data)) throwPublicError("tasks.loadPlannerTasks", error ?? new Error("Missing task rows"), "Unable to load your tasks right now.")
  const firstOrNull = <T,>(value: T | T[] | null) => Array.isArray(value) ? value[0] ?? null : value
  return {
    tasks: data.slice(0, TASK_PAGE_SIZE).map((task) => ({ ...task, subject: firstOrNull(task.subject), recurrence_type: firstOrNull(task.series)?.recurrence_type ?? null })),
    hasNext: data.length > TASK_PAGE_SIZE,
  }
}
