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

export async function updateDisplayName(formData: FormData) {
  const supabase = await getAuthedSupabase()
  const userId = await getAuthedUserId(supabase)
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
    throw new Error(error.message)
  }

  revalidatePath("/settings")
}
