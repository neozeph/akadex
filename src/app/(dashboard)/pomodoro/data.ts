import { cookies } from "next/headers"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { DEFAULT_BREAK_MINUTES, DEFAULT_FOCUS_MINUTES } from "@/lib/pomodoro"

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

  const [sessionsResult, todaySessionsResult, profileResult] = await Promise.all([
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
    supabase.from("profiles").select("focus_duration_minutes, break_duration_minutes").maybeSingle(),
  ])

  if (sessionsResult.error) {
    throw new Error(sessionsResult.error.message)
  }

  if (todaySessionsResult.error) {
    throw new Error(todaySessionsResult.error.message)
  }

  if (profileResult.error) {
    throw new Error(profileResult.error.message)
  }

  const completedToday = (todaySessionsResult.data ?? []).filter((session) => session.completed)
  const totalFocusMinutes = Math.round(
    completedToday.reduce((sum, session) => sum + Number(session.duration), 0) / 60,
  )

  // profileResult.data is null only if this user somehow has no profiles
  // row yet (handle_new_user() creates one at signup, so this is a defensive
  // fallback, not routine) — fall back to the same 25/5 defaults every user
  // effectively had before this sprint, rather than failing the page.
  const focusDurationMinutes = profileResult.data?.focus_duration_minutes ?? DEFAULT_FOCUS_MINUTES
  const breakDurationMinutes = profileResult.data?.break_duration_minutes ?? DEFAULT_BREAK_MINUTES

  return {
    recentSessions: sessionsResult.data ?? [],
    completedTodayCount: completedToday.length,
    totalFocusMinutes,
    focusDurationMinutes,
    breakDurationMinutes,
  }
}
