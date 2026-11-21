import { cookies } from "next/headers"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { DEFAULT_BREAK_MINUTES, DEFAULT_FOCUS_MINUTES } from "@/lib/pomodoro"
import { throwPublicError } from "@/lib/server-errors"
import { DEFAULT_TIME_ZONE, getDayBoundsInTimeZone, isValidTimeZone, toDateInTimeZone } from "@/lib/dates"

export async function getPomodoroPageData(userId: string) {
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient({
    getAll() {
      return cookieStore.getAll()
    },
  })

  const profileResult = await supabase.from("profiles").select("focus_duration_minutes, break_duration_minutes, timezone").eq("id", userId).maybeSingle()
  if (profileResult.error) {
    throwPublicError("pomodoro.loadProfile", profileResult.error, "Unable to load Pomodoro data right now.")
  }
  const timeZone = profileResult.data?.timezone ?? DEFAULT_TIME_ZONE
  if (!isValidTimeZone(timeZone)) throwPublicError("pomodoro.invalidTimezone", new Error("Invalid stored timezone"), "Unable to load Pomodoro data right now.")
  const { start, end } = getDayBoundsInTimeZone(toDateInTimeZone(new Date(), timeZone), timeZone)
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
      .gte("ended_at", start)
      .lt("ended_at", end),
  ])

  if (sessionsResult.error) {
    throwPublicError("pomodoro.loadRecentSessions", sessionsResult.error, "Unable to load Pomodoro data right now.")
  }

  if (todaySessionsResult.error) {
    throwPublicError("pomodoro.loadTodaySessions", todaySessionsResult.error, "Unable to load Pomodoro data right now.")
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
    timeZone,
  }
}
