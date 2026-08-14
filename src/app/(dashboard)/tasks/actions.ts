"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/supabase/session"
import { TASK_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS, parseTaskTags } from "@/lib/tasks"
import { RECURRENCE_OPTIONS, synchronizeRecurringTaskOccurrences, type RecurrenceOption } from "@/lib/recurrence"

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

async function ensureTaskOwnership(
  supabase: Awaited<ReturnType<typeof getAuthedSupabase>>,
  taskId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("tasks")
    .select("id")
    .eq("id", taskId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error || !data) {
    throw new Error("Task not found")
  }
}

/**
 * Never trusts a client-supplied subject id: confirms it exists and belongs
 * to the authenticated user before it's allowed to be stored on a task or
 * series. Empty input means "No Subject" and is left unvalidated (null).
 */
async function resolveSubjectId(
  supabase: Awaited<ReturnType<typeof getAuthedSupabase>>,
  userId: string,
  rawSubjectId: string,
) {
  const subjectId = rawSubjectId.trim()

  if (!subjectId) {
    return null
  }

  const { data, error } = await supabase
    .from("subjects")
    .select("id")
    .eq("id", subjectId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error || !data) {
    throw new Error("Selected subject was not found.")
  }

  return subjectId
}

function parseRecurrenceOption(value: string): RecurrenceOption {
  if (!RECURRENCE_OPTIONS.includes(value as RecurrenceOption)) {
    throw new Error("Invalid repeat option.")
  }

  return value as RecurrenceOption
}

function parsePriority(value: string) {
  if (!TASK_PRIORITY_OPTIONS.includes(value as (typeof TASK_PRIORITY_OPTIONS)[number])) {
    throw new Error("Invalid task priority.")
  }

  return value as (typeof TASK_PRIORITY_OPTIONS)[number]
}

function parseStatus(value: string) {
  if (!TASK_STATUS_OPTIONS.includes(value as (typeof TASK_STATUS_OPTIONS)[number])) {
    throw new Error("Invalid task status.")
  }

  return value as (typeof TASK_STATUS_OPTIONS)[number]
}

export async function createTask(formData: FormData) {
  const supabase = await getAuthedSupabase()
  const userId = await getAuthedUserId()

  const title = String(formData.get("title") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const tagsValue = String(formData.get("tags") ?? "").trim()
  const dueDateValue = String(formData.get("due_date") ?? "").trim()
  const priority = parsePriority(String(formData.get("priority") ?? "medium"))
  const status = parseStatus(String(formData.get("status") ?? "todo"))
  const repeat = parseRecurrenceOption(String(formData.get("repeat") ?? "none"))
  const subjectId = await resolveSubjectId(supabase, userId, String(formData.get("subject_id") ?? ""))

  if (!title) {
    throw new Error("Task title is required.")
  }

  if (repeat !== "none") {
    // Recurrence needs an anchor date to step forward from — never guess
    // one, and never fall back to silently creating a non-recurring task.
    if (!dueDateValue) {
      throw new Error("Recurring tasks need a due date to use as their start date.")
    }

    const { error: seriesError } = await supabase.from("task_series").insert({
      user_id: userId,
      subject_id: subjectId,
      title,
      description: description || null,
      tags: parseTaskTags(tagsValue),
      priority,
      recurrence_type: repeat,
      start_date: dueDateValue,
    })

    if (seriesError) {
      throw new Error(seriesError.message)
    }

    // Materialize occurrences immediately so the new series shows up on the
    // planner without waiting for the next page load.
    await synchronizeRecurringTaskOccurrences(supabase, userId)

    revalidatePath("/tasks")
    revalidatePath("/dashboard")
    revalidatePath("/semesters/[semesterId]", "page")
    revalidatePath("/semesters/[semesterId]/subjects/[subjectId]", "page")
    return
  }

  const { error } = await supabase.from("tasks").insert({
    user_id: userId,
    subject_id: subjectId,
    title,
    description: description || null,
    tags: parseTaskTags(tagsValue),
    due_date: dueDateValue || null,
    priority,
    status,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/tasks")
  revalidatePath("/dashboard")
  revalidatePath("/semesters/[semesterId]", "page")
  revalidatePath("/semesters/[semesterId]/subjects/[subjectId]", "page")
}

export async function updateTask(formData: FormData) {
  const supabase = await getAuthedSupabase()
  const userId = await getAuthedUserId()

  const taskId = String(formData.get("task_id") ?? "")
  const title = String(formData.get("title") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const tagsValue = String(formData.get("tags") ?? "").trim()
  const dueDateValue = String(formData.get("due_date") ?? "").trim()
  const priority = parsePriority(String(formData.get("priority") ?? "medium"))
  const status = parseStatus(String(formData.get("status") ?? "todo"))

  if (!taskId || !title) {
    throw new Error("Task title is required.")
  }

  await ensureTaskOwnership(supabase, taskId, userId)
  const subjectId = await resolveSubjectId(supabase, userId, String(formData.get("subject_id") ?? ""))

  // Editing an occurrence only ever touches this one `tasks` row — it never
  // writes back to task_series, so historical/other occurrences in the same
  // series are untouched by design (no "edit the whole series" path exists).
  const { error } = await supabase
    .from("tasks")
    .update({
      title,
      description: description || null,
      tags: parseTaskTags(tagsValue),
      due_date: dueDateValue || null,
      priority,
      status,
      subject_id: subjectId,
    })
    .eq("id", taskId)
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/tasks")
  revalidatePath("/dashboard")
  revalidatePath("/semesters/[semesterId]", "page")
  revalidatePath("/semesters/[semesterId]/subjects/[subjectId]", "page")
}

export async function deleteTask(formData: FormData) {
  const supabase = await getAuthedSupabase()
  const userId = await getAuthedUserId()
  const taskId = String(formData.get("task_id") ?? "")

  if (!taskId) {
    throw new Error("Task id is required.")
  }

  await ensureTaskOwnership(supabase, taskId, userId)

  const { error } = await supabase.from("tasks").delete().eq("id", taskId).eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/tasks")
  revalidatePath("/dashboard")
  revalidatePath("/semesters/[semesterId]", "page")
  revalidatePath("/semesters/[semesterId]/subjects/[subjectId]", "page")
}

export async function setTaskCompletion(formData: FormData) {
  const supabase = await getAuthedSupabase()
  const userId = await getAuthedUserId()
  const taskId = String(formData.get("task_id") ?? "")
  const completed = String(formData.get("completed") ?? "") === "true"

  if (!taskId) {
    throw new Error("Task id is required.")
  }

  await ensureTaskOwnership(supabase, taskId, userId)

  const { error } = await supabase
    .from("tasks")
    .update({
      status: completed ? "done" : "todo",
    })
    .eq("id", taskId)
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/tasks")
  revalidatePath("/dashboard")
  revalidatePath("/semesters/[semesterId]", "page")
  revalidatePath("/semesters/[semesterId]/subjects/[subjectId]", "page")
}
