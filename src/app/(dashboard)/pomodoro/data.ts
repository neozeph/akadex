import { cookies } from "next/headers"

import { createSupabaseServerClient } from "@/lib/supabase/server"

function startOfToday() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now.toISOString()
}

export async function getPomodoroPageData(userId: string) {
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient({
    getAll() {
      return cookieStore.getAll()
    },
  })

  const [sessionsResult, todaySessionsResult] = await Promise.all([
    supabase
      .from("pomodoro_sessions")
      .select("id, duration, completed, started_at, ended_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("pomodoro_sessions")
      .select("id, duration, completed, created_at")
      .eq("user_id", userId)
      .gte("created_at", startOfToday()),
  ])

  if (sessionsResult.error) {
    throw new Error(sessionsResult.error.message)
  }

  if (todaySessionsResult.error) {
    throw new Error(todaySessionsResult.error.message)
  }

  const completedToday = (todaySessionsResult.data ?? []).filter((session) => session.completed)
  const totalFocusMinutes = Math.round(
    completedToday.reduce((sum, session) => sum + Number(session.duration), 0) / 60,
  )

  return {
    recentSessions: sessionsResult.data ?? [],
    completedTodayCount: completedToday.length,
    totalFocusMinutes,
  }
}
