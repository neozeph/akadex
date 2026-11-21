import { readAllPages } from "@/lib/read-all-pages"
import { cookies } from "next/headers"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { calculateGwa } from "@/lib/grades"
import { measureOperation } from "@/lib/performance"
import { throwPublicError } from "@/lib/server-errors"
import { getUserTimeZone } from "@/lib/user-timezone"
import { getDayBoundsInTimeZone, toDateInTimeZone } from "@/lib/dates"

export type DashboardData = {
  overallGpa: number | null
  totalUnitsCompleted: number
  semesterCount: number
  pendingTaskCount: number
  completedTaskCount: number
  pomodoroSessionsToday: number
  focusMinutesToday: number
  upcomingTasks: Array<{
    id: string
    title: string
    due_date: string | null
    priority: string
    tags: string[]
    subject: { subject_code: string; subject_name: string } | null
  }>
}

export function getDashboardData(userId: string): Promise<DashboardData> {
  return measureOperation("dashboard", () => loadDashboardData(userId))
}

async function loadDashboardData(userId: string): Promise<DashboardData> {
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient({
    getAll() {
      return cookieStore.getAll()
    },
  })

  const timeZone = await getUserTimeZone(userId)
  const { start, end } = getDayBoundsInTimeZone(toDateInTimeZone(new Date(), timeZone), timeZone)
  const [
    semestersCountResult,
    subjectsResult,
    pendingTasksCountResult,
    completedTasksCountResult,
    upcomingTasksResult,
    pomodoroResult,
  ] = await Promise.all([
    supabase
      .from("semesters")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    readAllPages((from,to)=>supabase
      .from("subjects")
      .select("id, units, grade")
      .eq("user_id", userId).order("id").range(from,to)),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .neq("status", "done"),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "done"),
    supabase
      .from("tasks")
      .select("id, title, due_date, priority, status, tags, subject:subjects(subject_code, subject_name)")
      .eq("user_id", userId)
      .neq("status", "done")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(5),
    supabase.rpc("focus_summary", { p_start: start, p_end: end }),
  ])

  const failedQuery = [semestersCountResult, subjectsResult, pendingTasksCountResult, completedTasksCountResult, upcomingTasksResult, pomodoroResult].find((result) => result.error)
  if (failedQuery?.error) {
    throwPublicError("dashboard.load", failedQuery.error, "Unable to load your dashboard right now.")
  }
  const counts = [semestersCountResult.count, pendingTasksCountResult.count, completedTasksCountResult.count]
  const rows = [subjectsResult.data, upcomingTasksResult.data]
  if (counts.some((value) => typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) || rows.some((value) => !Array.isArray(value)) || !pomodoroResult.data || !Number.isSafeInteger(pomodoroResult.data.count) || !Number.isFinite(pomodoroResult.data.seconds)) {
    throwPublicError("dashboard.invalidResponse", new Error("Incomplete dashboard response"), "Unable to load your dashboard right now.")
  }

  const subjects = subjectsResult.data ?? []
  const upcomingTasks = upcomingTasksResult.data ?? []
  const focus = pomodoroResult.data as { count: number; seconds: number }

  const totalUnitsCompleted = subjects
    .filter((subject) => subject.grade !== null)
    .reduce((sum, subject) => sum + Number(subject.units), 0)
  const overallGpa = calculateGwa(subjects)

  // Without generated Supabase types, an embedded relationship is typed as
  // an array regardless of FK cardinality — normalize the actual
  // many-to-one row PostgREST returns at runtime into a single object.
  const firstOrNull = <T,>(value: T | T[] | null | undefined): T | null =>
    Array.isArray(value) ? (value[0] ?? null) : (value ?? null)

  return {
    overallGpa,
    totalUnitsCompleted,
    semesterCount: semestersCountResult.count ?? 0,
    pendingTaskCount: pendingTasksCountResult.count ?? 0,
    completedTaskCount: completedTasksCountResult.count ?? 0,
    pomodoroSessionsToday: focus.count,
    focusMinutesToday: Math.round(focus.seconds / 60),
    upcomingTasks: upcomingTasks
      .map((task) => ({
        id: task.id,
        title: task.title,
        due_date: task.due_date,
        priority: task.priority,
        tags: task.tags ?? [],
        subject: firstOrNull(task.subject),
      })),
  }
}
