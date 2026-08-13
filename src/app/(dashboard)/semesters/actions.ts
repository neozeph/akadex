"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/supabase/session"
import { SCHOOL_YEAR_START_MAX, SCHOOL_YEAR_START_MIN, TERM_OPTIONS } from "@/lib/semesters"

async function getAuthedSupabase() {
  const cookieStore = await cookies()

  return createSupabaseServerClient({
    getAll() {
      return cookieStore.getAll()
    },
  })
}

function parseYearLevel(value: string) {
  const yearLevel = Number(value)

  if (!Number.isInteger(yearLevel) || yearLevel < 1 || yearLevel > 6) {
    throw new Error("Year level must be between 1 and 6.")
  }

  return yearLevel
}

function parseTerm(value: string) {
  if (!TERM_OPTIONS.some((option) => option.value === value)) {
    throw new Error("Term must be 1st semester, 2nd semester, or summer.")
  }

  return value
}

function parseSchoolYearStart(value: string) {
  const schoolYearStart = Number(value)

  if (
    !Number.isInteger(schoolYearStart) ||
    schoolYearStart < SCHOOL_YEAR_START_MIN ||
    schoolYearStart > SCHOOL_YEAR_START_MAX
  ) {
    throw new Error("School year must be a valid year.")
  }

  return schoolYearStart
}

export async function createSemester(formData: FormData) {
  const supabase = await getAuthedSupabase()

  const yearLevel = parseYearLevel(String(formData.get("year_level") ?? ""))
  const term = parseTerm(String(formData.get("term") ?? ""))
  const schoolYearStart = parseSchoolYearStart(String(formData.get("school_year_start") ?? ""))

  const user = await getAuthenticatedUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  const userId = user.id

  const { error } = await supabase.from("semesters").insert({
    user_id: userId,
    year_level: yearLevel,
    term,
    school_year_start: schoolYearStart,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/semesters")
  revalidatePath("/dashboard")
}

export async function updateSemester(formData: FormData) {
  const supabase = await getAuthedSupabase()

  const semesterId = String(formData.get("semester_id") ?? "")

  if (!semesterId) {
    throw new Error("Semester id is required.")
  }

  const yearLevel = parseYearLevel(String(formData.get("year_level") ?? ""))
  const term = parseTerm(String(formData.get("term") ?? ""))
  const schoolYearStart = parseSchoolYearStart(String(formData.get("school_year_start") ?? ""))

  const user = await getAuthenticatedUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  const userId = user.id

  const { error } = await supabase
    .from("semesters")
    .update({
      year_level: yearLevel,
      term,
      school_year_start: schoolYearStart,
      // Clear the legacy free-text fields now that this row has been
      // converted to the structured model, so stale text can't shadow it.
      title: null,
      school_year: null,
    })
    .eq("id", semesterId)
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/semesters")
  revalidatePath(`/semesters/${semesterId}`)
  revalidatePath("/dashboard")
}

export async function deleteSemester(formData: FormData) {
  const supabase = await getAuthedSupabase()
  const semesterId = String(formData.get("semester_id") ?? "")

  if (!semesterId) {
    throw new Error("Semester id is required.")
  }

  const user = await getAuthenticatedUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  const userId = user.id

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
