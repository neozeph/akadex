"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/supabase/session"
import { throwPublicError } from "@/lib/server-errors"

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

export async function updateDisplayName(formData: FormData) {
  const supabase = await getAuthedSupabase()
  const userId = await getAuthedUserId()
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

  revalidatePath("/settings")
}
