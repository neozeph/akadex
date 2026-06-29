"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { TASK_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS, parseTaskTags } from "@/lib/tasks"

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
  const userId = await getAuthedUserId(supabase)

  const title = String(formData.get("title") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const tagsValue = String(formData.get("tags") ?? "").trim()
  const dueDateValue = String(formData.get("due_date") ?? "").trim()
  const priority = parsePriority(String(formData.get("priority") ?? "medium"))
  const status = parseStatus(String(formData.get("status") ?? "todo"))

  if (!title) {
    throw new Error("Task title is required.")
  }

  const { error } = await supabase.from("tasks").insert({
    user_id: userId,
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
}

export async function updateTask(formData: FormData) {
  const supabase = await getAuthedSupabase()
  const userId = await getAuthedUserId(supabase)

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

  const { error } = await supabase
    .from("tasks")
    .update({
      title,
      description: description || null,
      tags: parseTaskTags(tagsValue),
      due_date: dueDateValue || null,
      priority,
      status,
    })
    .eq("id", taskId)
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/tasks")
  revalidatePath("/dashboard")
}

export async function deleteTask(formData: FormData) {
  const supabase = await getAuthedSupabase()
  const userId = await getAuthedUserId(supabase)
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
}

export async function setTaskCompletion(formData: FormData) {
  const supabase = await getAuthedSupabase()
  const userId = await getAuthedUserId(supabase)
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
}
