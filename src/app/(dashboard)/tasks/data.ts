import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/supabase/session"
import { formatSubjectOptionLabel } from "@/lib/subjects"
import { synchronizeRecurringTaskOccurrences } from "@/lib/recurrence"

export type TasksSearchParams = {
  q?: string
  status?: string
  subject?: string
  priority?: string
}

/**
 * Explicit recurrence synchronization boundary + planner read, in that
 * order. The mutation (synchronizeRecurringTaskOccurrences) always runs
 * first and to completion before any task data is fetched, so the page
 * component below never triggers recurrence writes as a side effect of
 * rendering — it only ever reads what this function returns.
 */
export async function getTaskPlannerData(searchParams: TasksSearchParams) {
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

  await synchronizeRecurringTaskOccurrences(supabase, userId)

  const [tasksResult, subjectsResult] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, title, description, tags, due_date, priority, status, subject_id, series_id, created_at, subject:subjects(subject_code, subject_name)",
      )
      .eq("user_id", userId)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("subjects")
      .select("id, subject_code, subject_name, semester:semesters(year_level, term, school_year_start)")
      .eq("user_id", userId)
      .order("subject_code", { ascending: true }),
  ])

  if (tasksResult.error) {
    throw new Error(tasksResult.error.message)
  }

  if (subjectsResult.error) {
    throw new Error(subjectsResult.error.message)
  }

  // Without generated Supabase types, an embedded relationship is typed as
  // an array regardless of FK cardinality — normalize the actual
  // many-to-one row PostgREST returns at runtime into a single object.
  const firstOrNull = <T,>(value: T | T[] | null | undefined): T | null =>
    Array.isArray(value) ? (value[0] ?? null) : (value ?? null)

  const allTasks = (tasksResult.data ?? []).map((task) => ({
    ...task,
    subject: firstOrNull(task.subject),
  }))
  const subjects = (subjectsResult.data ?? []).map((subject) => ({
    id: subject.id,
    code: subject.subject_code,
    label: formatSubjectOptionLabel({
      id: subject.id,
      subject_code: subject.subject_code,
      subject_name: subject.subject_name,
      semester: firstOrNull(subject.semester),
    }),
  }))

  const searchTerm = searchParams.q?.trim().toLowerCase() ?? ""
  const filteredTasks = allTasks.filter((task) => {
    // One search box covers title, description, and tags (OR, not AND) —
    // there's no separate tag-filter UI, so this is the only way typing
    // "exam" finds a task whose only match is a tag rather than the title.
    const searchMatches =
      !searchTerm ||
      task.title.toLowerCase().includes(searchTerm) ||
      Boolean(task.description?.toLowerCase().includes(searchTerm)) ||
      (Array.isArray(task.tags) && task.tags.some((tag) => tag.toLowerCase().includes(searchTerm)))
    // No explicit status filter means "Active" (todo + in_progress) — done
    // tasks are hidden from the default planner and only surface when the
    // user explicitly selects the Done filter (or any other single status).
    const statusMatches = searchParams.status ? task.status === searchParams.status : task.status !== "done"
    const subjectMatches = !searchParams.subject || task.subject_id === searchParams.subject
    const priorityMatches = !searchParams.priority || task.priority === searchParams.priority

    return searchMatches && statusMatches && subjectMatches && priorityMatches
  })

  return {
    allTasks,
    tasks: filteredTasks,
    subjects,
  }
}
