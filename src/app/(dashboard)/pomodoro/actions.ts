"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/supabase/session"
import { MAX_POMODORO_MINUTES, MIN_POMODORO_MINUTES } from "@/lib/pomodoro"

async function getAuthedSupabase() {
  const cookieStore = await cookies()

  return createSupabaseServerClient({
    getAll() {
      return cookieStore.getAll()
    },
  })
}

async function getAuthedUserId() {
  const user = await getAuthenticatedUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  return user.id
}

function parseDurationMinutes(value: string, label: string) {
  const minutes = Number(value)

  if (!Number.isInteger(minutes) || minutes < MIN_POMODORO_MINUTES || minutes > MAX_POMODORO_MINUTES) {
    throw new Error(
      `${label} must be a whole number between ${MIN_POMODORO_MINUTES} and ${MAX_POMODORO_MINUTES} minutes.`,
    )
  }

  return minutes
}

export async function updatePomodoroPreferences(formData: FormData) {
  const supabase = await getAuthedSupabase()
  const userId = await getAuthedUserId()

  const focusDurationMinutes = parseDurationMinutes(
    String(formData.get("focus_duration_minutes") ?? ""),
    "Focus duration",
  )
  const breakDurationMinutes = parseDurationMinutes(
    String(formData.get("break_duration_minutes") ?? ""),
    "Break duration",
  )

  // Same upsert-by-id pattern as settings/actions.ts's updateDisplayName:
  // creates the profiles row if it's somehow missing instead of requiring a
  // separate preferences table or a parallel "does a row exist" branch.
  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      focus_duration_minutes: focusDurationMinutes,
      break_duration_minutes: breakDurationMinutes,
    },
    {
      onConflict: "id",
    },
  )

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/pomodoro")
}

export async function logPomodoroSession(formData: FormData) {
  const supabase = await getAuthedSupabase()
  const userId = await getAuthedUserId()

  const durationValue = String(formData.get("duration") ?? "").trim()
  const completedValue = String(formData.get("completed") ?? "true") === "true"
  const startedAtValue = String(formData.get("started_at") ?? "").trim()
  const endedAtValue = String(formData.get("ended_at") ?? "").trim()

  const duration = Number(durationValue)

  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("Duration must be greater than zero.")
  }

  const { error } = await supabase.from("pomodoro_sessions").insert({
    user_id: userId,
    duration,
    completed: completedValue,
    started_at: startedAtValue || new Date().toISOString(),
    ended_at: endedAtValue || new Date().toISOString(),
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/pomodoro")
  revalidatePath("/dashboard")
}
