"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

import { createSupabaseServerClient } from "@/lib/supabase/server"

async function getAuthedSupabase() {
  const cookieStore = await cookies()

  return createSupabaseServerClient({
    getAll() {
      return cookieStore.getAll()
    },
  })
}

async function getAuthedUserId(supabase: Awaited<ReturnType<typeof getAuthedSupabase>>) {
  const { data, error } = await supabase.auth.getClaims()

  if (error || !data?.claims?.sub) {
    throw new Error("Unauthorized")
  }

  return data.claims.sub
}

export async function logPomodoroSession(formData: FormData) {
  const supabase = await getAuthedSupabase()
  const userId = await getAuthedUserId(supabase)

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
