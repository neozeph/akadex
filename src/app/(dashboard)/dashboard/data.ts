import { cookies } from "next/headers"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { calculateGwa } from "@/lib/grades"

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

function startOfToday() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now.toISOString()
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient({
    getAll() {
      return cookieStore.getAll()
    },
  })

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
    supabase
      .from("subjects")
      .select("id, units, grade")
      .eq("user_id", userId),
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
    supabase
      .from("pomodoro_sessions")
      .select("duration, completed")
      .eq("user_id", userId)
      .gte("created_at", startOfToday()),
  ])

  const subjects = subjectsResult.data ?? []
  const upcomingTasks = upcomingTasksResult.data ?? []
  const pomodoroSessions = pomodoroResult.data ?? []

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
    pomodoroSessionsToday: pomodoroSessions.filter((session) => session.completed).length,
    focusMinutesToday: Math.round(
      pomodoroSessions
        .filter((session) => session.completed)
        .reduce((sum, session) => sum + Number(session.duration), 0) / 60,
    ),
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
