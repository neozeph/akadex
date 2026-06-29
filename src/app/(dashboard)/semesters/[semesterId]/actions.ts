"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { GRADE_OPTIONS } from "@/lib/grades"

async function getAuthedSupabase() {
  const cookieStore = await cookies()

  return createSupabaseServerClient({
    getAll() {
      return cookieStore.getAll()
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value, options }) => {
        cookieStore.set(name, value, options)
      })
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

async function ensureSemesterOwnership(
  supabase: Awaited<ReturnType<typeof getAuthedSupabase>>,
  semesterId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("semesters")
    .select("id")
    .eq("id", semesterId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error || !data) {
    throw new Error("Semester not found")
  }
}

function parseOptionalGrade(value: string) {
  if (!value) {
    return null
  }

  const grade = Number(value)

  if (!GRADE_OPTIONS.includes(grade as (typeof GRADE_OPTIONS)[number])) {
    throw new Error("Grade must be one of the allowed values.")
  }

  return grade
}

export async function createSubject(formData: FormData) {
  const supabase = await getAuthedSupabase()
  const semesterId = String(formData.get("semester_id") ?? "")
  const subjectCode = String(formData.get("subject_code") ?? "").trim()
  const subjectName = String(formData.get("subject_name") ?? "").trim()
  const unitsValue = String(formData.get("units") ?? "").trim()
  const gradeValue = String(formData.get("grade") ?? "").trim()

  if (!semesterId || !subjectCode || !subjectName || !unitsValue) {
    throw new Error("Subject code, name, and units are required.")
  }

  const userId = await getAuthedUserId(supabase)
  await ensureSemesterOwnership(supabase, semesterId, userId)

  const units = Number(unitsValue)
  const grade = parseOptionalGrade(gradeValue)

  if (!Number.isFinite(units) || units <= 0) {
    throw new Error("Units must be greater than zero.")
  }

  const { error } = await supabase.from("subjects").insert({
    user_id: userId,
    semester_id: semesterId,
    subject_code: subjectCode,
    subject_name: subjectName,
    units,
    grade,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/semesters/${semesterId}`)
  revalidatePath("/semesters")
  revalidatePath("/dashboard")
}

export async function updateSubject(formData: FormData) {
  const supabase = await getAuthedSupabase()
  const semesterId = String(formData.get("semester_id") ?? "")
  const subjectId = String(formData.get("subject_id") ?? "")
  const subjectCode = String(formData.get("subject_code") ?? "").trim()
  const subjectName = String(formData.get("subject_name") ?? "").trim()
  const unitsValue = String(formData.get("units") ?? "").trim()
  const gradeValue = String(formData.get("grade") ?? "").trim()

  if (!semesterId || !subjectId || !subjectCode || !subjectName || !unitsValue) {
    throw new Error("Subject code, name, and units are required.")
  }

  const userId = await getAuthedUserId(supabase)
  await ensureSemesterOwnership(supabase, semesterId, userId)

  const units = Number(unitsValue)
  const grade = parseOptionalGrade(gradeValue)

  if (!Number.isFinite(units) || units <= 0) {
    throw new Error("Units must be greater than zero.")
  }

  const { error } = await supabase
    .from("subjects")
    .update({
      subject_code: subjectCode,
      subject_name: subjectName,
      units,
      grade,
    })
    .eq("id", subjectId)
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/semesters/${semesterId}`)
  revalidatePath("/semesters")
  revalidatePath("/dashboard")
}

export async function deleteSubject(formData: FormData) {
  const supabase = await getAuthedSupabase()
  const semesterId = String(formData.get("semester_id") ?? "")
  const subjectId = String(formData.get("subject_id") ?? "")

  if (!semesterId || !subjectId) {
    throw new Error("Subject id is required.")
  }

  const userId = await getAuthedUserId(supabase)
  await ensureSemesterOwnership(supabase, semesterId, userId)

  const { error } = await supabase
    .from("subjects")
    .delete()
    .eq("id", subjectId)
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/semesters/${semesterId}`)
  revalidatePath("/semesters")
  revalidatePath("/dashboard")
}
