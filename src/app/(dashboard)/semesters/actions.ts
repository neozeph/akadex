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

export async function createSemester(formData: FormData) {
  const supabase = await getAuthedSupabase()

  const title = String(formData.get("title") ?? "").trim()
  const schoolYear = String(formData.get("school_year") ?? "").trim()

  if (!title || !schoolYear) {
    throw new Error("Title and school year are required.")
  }

  const { data: claimsResult, error: claimsError } = await supabase.auth.getClaims()

  if (claimsError || !claimsResult?.claims?.sub) {
    throw new Error("Unauthorized")
  }

  const userId = claimsResult.claims.sub

  const { error } = await supabase.from("semesters").insert({
    user_id: userId,
    title,
    school_year: schoolYear,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/semesters")
  revalidatePath("/dashboard")
}

export async function deleteSemester(formData: FormData) {
  const supabase = await getAuthedSupabase()
  const semesterId = String(formData.get("semester_id") ?? "")

  if (!semesterId) {
    throw new Error("Semester id is required.")
  }

  const { data: claimsResult, error: claimsError } = await supabase.auth.getClaims()

  if (claimsError || !claimsResult?.claims?.sub) {
    throw new Error("Unauthorized")
  }

  const userId = claimsResult.claims.sub

  const { error } = await supabase
    .from("semesters")
    .delete()
    .eq("id", semesterId)
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/semesters")
  revalidatePath("/dashboard")
}
