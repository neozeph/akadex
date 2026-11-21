"use server"

import { cookies } from "next/headers"
import { revalidateTaskViews } from "@/lib/mutation-cache"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/supabase/session"
import { throwPublicError } from "@/lib/server-errors"
import { TASK_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS, parseTaskTags } from "@/lib/tasks"
import {
  RECURRENCE_OPTIONS,
  type RecurrenceOption,
  type TaskRecurrenceType,
} from "@/lib/recurrence"

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
 * Like ensureTaskOwnership, but also returns the task's current status —
 * updateTask needs this to tell a real todo->done (or done->todo) transition
 * apart from "still done, editing an unrelated field," which must NOT
 * overwrite the original completed_at.
 */
async function getOwnedTaskStatus(
  supabase: Awaited<ReturnType<typeof getAuthedSupabase>>,
  taskId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("tasks")
    .select("status, series_id, due_date")
    .eq("id", taskId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error || !data) {
    throw new Error("Task not found")
  }

  return data
}

type OwnedTaskCompletionState = {
  status: string
  due_date: string | null
  series_id: string | null
  series: {
    recurrence_type: TaskRecurrenceType
    start_date: string
    active: boolean
  } | null
}

async function getOwnedTaskCompletionState(
  supabase: Awaited<ReturnType<typeof getAuthedSupabase>>,
  taskId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("tasks")
    .select("status, due_date, series_id, series:task_series(recurrence_type, start_date, active)")
    .eq("id", taskId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error || !data) {
    throw new Error("Task not found")
  }

  const series = Array.isArray(data.series) ? (data.series[0] ?? null) : (data.series ?? null)

  return {
    status: data.status,
    due_date: data.due_date,
    series_id: data.series_id,
    series,
  } as OwnedTaskCompletionState
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

    const taskValues = {
      user_id: userId,
      subject_id: subjectId,
      title,
      description: description || null,
      tags: parseTaskTags(tagsValue),
      priority,
    }

    const { data: series, error: seriesError } = await supabase
      .from("task_series")
      .insert({
        ...taskValues,
        recurrence_type: repeat,
        start_date: dueDateValue,
      })
      .select("id")
      .single()

    if (seriesError) {
      throwPublicError("tasks.createSeries", seriesError, "Unable to create the recurring task. Please try again.")
    }

    const { error: taskError } = await supabase.from("tasks").insert({
      ...taskValues,
      series_id: series.id,
      due_date: dueDateValue,
      status: "todo",
    })

    if (taskError) {
      throwPublicError("tasks.createRecurringTask", taskError, "Unable to create the recurring task. Please try again.")
    }

    await revalidateTaskViews()
    return
  }

  // Recurring occurrences always insert as "todo" (see recurrence.ts), so
  // this direct-creation completed_at handling only ever applies here —
  // creating a task straight into "Done" is a real (if rare) completion.
  const { error } = await supabase.from("tasks").insert({
    user_id: userId,
    subject_id: subjectId,
    title,
    description: description || null,
    tags: parseTaskTags(tagsValue),
    due_date: dueDateValue || null,
    priority,
    status,
    completed_at: status === "done" ? new Date().toISOString() : null,
  })

  if (error) {
    throwPublicError("tasks.create", error, "Unable to create the task. Please try again.")
  }

  await revalidateTaskViews()
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

  const currentTask = await getOwnedTaskStatus(supabase, taskId, userId)
  const currentStatus = currentTask.status
  const occurrenceSnapshot = String(formData.get("due_date_snapshot") ?? "")
  if (currentTask.series_id && occurrenceSnapshot !== currentTask.due_date) throw new Error("This occurrence changed. Reload the task before editing it.")
  if (currentTask.series_id && status === "done" && currentStatus !== "done") {
    throw new Error("Use the task checkbox to complete a recurring occurrence and save its history.")
  }
  const subjectId = await resolveSubjectId(supabase, userId, String(formData.get("subject_id") ?? ""))

  // Only a real todo/in_progress <-> done transition touches completed_at.
  // Staying "done" while editing an unrelated field (title, priority, due
  // date, subject) must never overwrite the original completion timestamp.
  const completedAtPatch =
    status === "done" && currentStatus !== "done"
      ? { completed_at: new Date().toISOString() }
      : status !== "done" && currentStatus === "done"
        ? { completed_at: null }
        : {}

  // Editing an occurrence only ever touches this one `tasks` row — it never
  // writes back to task_series, so historical/other occurrences in the same
  // series are untouched by design (no "edit the whole series" path exists).
  let mutation = supabase
    .from("tasks")
    .update({
      title,
      description: description || null,
      tags: parseTaskTags(tagsValue),
      due_date: dueDateValue || null,
      priority,
      status,
      subject_id: subjectId,
      ...completedAtPatch,
    })
    .eq("id", taskId)
    .eq("user_id", userId)
  if (currentTask.series_id) mutation = mutation.eq("due_date", occurrenceSnapshot)
  const { data: updated, error } = await mutation.select("id")
  if (error || !updated?.length) {
    throwPublicError("tasks.update", error ?? new Error("Stale occurrence"), "Unable to update the task. Reload it and try again.")
  }

  await revalidateTaskViews()
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
    throwPublicError("tasks.delete", error, "Unable to delete the task. Please try again.")
  }

  await revalidateTaskViews()
}

async function executeTaskCompletion(formData: FormData) {
  const supabase = await getAuthedSupabase()
  const userId = await getAuthedUserId()
  const taskId = String(formData.get("task_id") ?? "")
  const completed = String(formData.get("completed") ?? "") === "true"

  if (!taskId) {
    throw new Error("Task id is required.")
  }

  await ensureTaskOwnership(supabase, taskId, userId)

  const dueDateSnapshot = String(formData.get("due_date_snapshot") ?? "")
  const task = await getOwnedTaskCompletionState(supabase, taskId, userId)

  if (completed && task.series_id && task.series?.active) {
    if (!dueDateSnapshot) throw new Error("Reload this task before completing its occurrence.")
    const { error } = await supabase.rpc("complete_recurring_task", { p_task_id: taskId, p_occurrence_date: dueDateSnapshot })

    if (error) {
      throwPublicError("tasks.rollRecurringCompletion", error, "Unable to update the task status. Please try again.")
    }

    await revalidateTaskViews()
    return
  }

  // Every call here is an explicit user action to mark complete or
  // incomplete (the planner checkbox), never an unrelated-field edit — so
  // marking complete always stamps a fresh completed_at, including
  // re-completing a task that was previously uncompleted.
  const { error } = await supabase
    .from("tasks")
    .update({
      status: completed ? "done" : "todo",
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq("id", taskId)
    .eq("user_id", userId)

  if (error) {
    throwPublicError("tasks.setCompletion", error, "Unable to update the task status. Please try again.")
  }

  await revalidateTaskViews()
}

export async function setTaskCompletion(formData: FormData) { await executeTaskCompletion(formData) }

async function matchesCachedAccount(expectedUserId: string) {
  return (await getAuthenticatedUser())?.id === expectedUserId
}
export async function completeCachedTask(expectedUserId: string, formData: FormData) {
  if (!(await matchesCachedAccount(expectedUserId))) return { accountChanged: true as const }
  await executeTaskCompletion(formData)
  const supabase = await getAuthedSupabase()
  const { data, error } = await supabase.from("tasks").select("id, status, due_date")
    .eq("id", String(formData.get("task_id") ?? "")).eq("user_id", expectedUserId).maybeSingle()
  if (error) throwPublicError("tasks.confirmCompletion", error, "Unable to confirm completion. Please retry.")
  return { accountChanged: false as const, task: data }
}
export async function createCachedTask(expectedUserId: string, formData: FormData) {
  if (!(await matchesCachedAccount(expectedUserId))) return { accountChanged: true as const }
  await createTask(formData)
  return { accountChanged: false as const }
}
export async function updateCachedTask(expectedUserId: string, formData: FormData) {
  if (!(await matchesCachedAccount(expectedUserId))) return { accountChanged: true as const }
  await updateTask(formData)
  return { accountChanged: false as const }
}
export async function deleteCachedTask(expectedUserId: string, formData: FormData) {
  if (!(await matchesCachedAccount(expectedUserId))) return { accountChanged: true as const }
  await deleteTask(formData)
  return { accountChanged: false as const }
}
