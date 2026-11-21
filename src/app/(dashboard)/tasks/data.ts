import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/supabase/session"
import { formatSubjectOptionLabel } from "@/lib/subjects"
import { synchronizeRecurringTaskOccurrences } from "@/lib/recurrence"
import { throwPublicError } from "@/lib/server-errors"
import { measureOperation } from "@/lib/performance"
import { getUserTimeZone } from "@/lib/user-timezone"
import { toDateInTimeZone } from "@/lib/dates"
import { parseTaskQuery, type TasksSearchParams } from "@/lib/task-query"
import { queryTaskPage } from "@/lib/task-query-server"

export type { TasksSearchParams } from "@/lib/task-query"

/**
 * Explicit recurrence synchronization boundary + planner read, in that
 * order. The mutation (synchronizeRecurringTaskOccurrences) always runs
 * first and to completion before any task data is fetched, so the page
 * component below never triggers recurrence writes as a side effect of
 * rendering — it only ever reads what this function returns.
 */
export function getTaskPlannerData(searchParams: TasksSearchParams, includeTasks = true) {
  return measureOperation("planner", () => loadTaskPlannerData(searchParams, includeTasks))
}

async function loadTaskPlannerData(searchParams: TasksSearchParams, includeTasks: boolean) {
  const { filters, page, invalid } = parseTaskQuery(searchParams)
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
  const timeZone = await getUserTimeZone(userId)
  const todayISO = toDateInTimeZone(new Date(), timeZone)

  await synchronizeRecurringTaskOccurrences(supabase, userId)

  const [taskPage, subjectsResult] = await Promise.all([
    includeTasks ? queryTaskPage(supabase, filters, page) : null,
    supabase
      .from("subjects")
      .select("id, subject_code, subject_name, semester:semesters(year_level, term, school_year_start)")
      .eq("user_id", userId)
      .order("subject_code", { ascending: true }),
  ])

  if (subjectsResult.error) {
    throwPublicError("tasks.loadPlannerSubjects", subjectsResult.error, "Unable to load your tasks right now.")
  }

  // Without generated Supabase types, an embedded relationship is typed as
  // an array regardless of FK cardinality — normalize the actual
  // many-to-one row PostgREST returns at runtime into a single object.
  const firstOrNull = <T,>(value: T | T[] | null | undefined): T | null =>
    Array.isArray(value) ? (value[0] ?? null) : (value ?? null)

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

  return {
    todayISO,
    timeZone,
    userId,
    taskPage,
    filters,
    page,
    invalidFilters: invalid,
    subjects,
  }
}
