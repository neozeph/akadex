import { cookies } from "next/headers"

import { createSupabaseServerClient } from "@/lib/supabase/server"

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

  const [semestersResult, subjectsResult, tasksResult, upcomingTasksResult, pomodoroResult] = await Promise.all([
    supabase
      .from("semesters")
      .select("id")
      .eq("user_id", userId),
    supabase
      .from("subjects")
      .select("id, units, grade")
      .eq("user_id", userId),
    supabase
      .from("tasks")
      .select("id, title, due_date, priority, status")
      .eq("user_id", userId),
    supabase
      .from("tasks")
      .select("id, title, due_date, priority, status, tags")
      .eq("user_id", userId)
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(5),
    supabase
      .from("pomodoro_sessions")
      .select("id, duration, completed, created_at")
      .eq("user_id", userId)
      .gte("created_at", startOfToday()),
  ])

  const semesters = semestersResult.data ?? []
  const subjects = subjectsResult.data ?? []
  const tasks = tasksResult.data ?? []
  const upcomingTasks = upcomingTasksResult.data ?? []
  const pomodoroSessions = pomodoroResult.data ?? []

  const gradedSubjects = subjects.filter((subject) => subject.grade !== null)
  const totalUnitsCompleted = gradedSubjects.reduce((sum, subject) => sum + Number(subject.units), 0)
  const weightedGradePoints = gradedSubjects.reduce(
    (sum, subject) => sum + Number(subject.units) * Number(subject.grade),
    0,
  )
  const overallGpa = totalUnitsCompleted > 0 ? weightedGradePoints / totalUnitsCompleted : null

  return {
    overallGpa,
    totalUnitsCompleted,
    semesterCount: semesters.length,
    pendingTaskCount: tasks.filter((task) => task.status !== "done").length,
    completedTaskCount: tasks.filter((task) => task.status === "done").length,
    pomodoroSessionsToday: pomodoroSessions.filter((session) => session.completed).length,
    focusMinutesToday: Math.round(
      pomodoroSessions
        .filter((session) => session.completed)
        .reduce((sum, session) => sum + Number(session.duration), 0) / 60,
    ),
    upcomingTasks: upcomingTasks
      .filter((task) => task.status !== "done")
      .map((task) => ({
        id: task.id,
        title: task.title,
        due_date: task.due_date,
        priority: task.priority,
        tags: task.tags ?? [],
      })),
  }
}
