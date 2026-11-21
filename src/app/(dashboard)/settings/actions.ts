"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { revalidateTaskViews } from "@/lib/mutation-cache"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/supabase/session"
import { throwPublicError } from "@/lib/server-errors"
import { isValidTimeZone } from "@/lib/dates"
import { getProfileDisplayName } from "@/lib/profile-name"

export async function updateTimeZone(formData: FormData) {
  const timeZone = String(formData.get("timezone") ?? "").trim()
  if (!isValidTimeZone(timeZone)) return { error: "Enter a valid IANA timezone, such as Asia/Manila." }
  const userId = await getAuthedUserId()
  const supabase = await getAuthedSupabase()
  const { error } = await supabase.from("profiles").upsert({ id: userId, timezone: timeZone }, { onConflict: "id" })
  if (error) {
    return { error: "Unable to save your timezone. Please try again." }
  }
  await revalidateTaskViews()
  revalidatePath("/settings")
  revalidatePath("/pomodoro")
  return { error: null }
}

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

export async function updateDisplayName(expectedUserId:string,formData: FormData) {
  const supabase = await getAuthedSupabase()
  const user=await getAuthenticatedUser()
  if(!user || user.id!==expectedUserId)return {accountChanged:true as const}
  const userId=user.id
  const fullName = String(formData.get("full_name") ?? "").trim()

  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        full_name: fullName || null,
      },
      {
        onConflict: "id",
      },
    )

  if (error) {
    throwPublicError("settings.updateDisplayName", error, "Unable to update your profile. Please try again.")
  }

  revalidatePath("/", "layout")
  return {accountChanged:false as const,userId,displayName:getProfileDisplayName(user,fullName||null)}
}
