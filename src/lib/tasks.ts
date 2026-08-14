import { formatColumnMonthDay } from "@/lib/dates"

export const TASK_PRIORITY_OPTIONS = ["low", "medium", "high", "urgent"] as const
export const TASK_STATUS_OPTIONS = ["todo", "in_progress", "done"] as const

export type TaskPriority = (typeof TASK_PRIORITY_OPTIONS)[number]
export type TaskStatus = (typeof TASK_STATUS_OPTIONS)[number]

/**
 * Urgency bucket for a flat (non-column) task list: overdue, then today,
 * then upcoming by date, then no due date last. Pure YYYY-MM-DD string
 * comparisons (no `Date` parsing), same technique TaskBoard already uses
 * for its column ordering, so this carries no timezone regression risk.
 */
function taskUrgencyRank(dueDate: string | null, todayISO: string) {
  if (!dueDate) return 3
  if (dueDate < todayISO) return 0
  if (dueDate === todayISO) return 1
  return 2
}

export function compareTasksByUrgency(
  a: { due_date: string | null },
  b: { due_date: string | null },
  todayISO: string,
) {
  const rankDiff = taskUrgencyRank(a.due_date, todayISO) - taskUrgencyRank(b.due_date, todayISO)

  if (rankDiff !== 0) {
    return rankDiff
  }

  if (a.due_date && b.due_date && a.due_date !== b.due_date) {
    return a.due_date < b.due_date ? -1 : 1
  }

  return 0
}

/** Subtle due-date label for contexts without a date-grouped column header (e.g. the Subject Workspace list). */
export function formatTaskDueDateLabel(dueDate: string | null, todayISO: string) {
  if (!dueDate) {
    return null
  }

  if (dueDate < todayISO) {
    return "Overdue"
  }

  if (dueDate === todayISO) {
    return "Today"
  }

  return formatColumnMonthDay(dueDate)
}

export function parseTaskTags(input: string) {
  return input
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => tag.toLowerCase())
    .filter((tag, index, array) => array.indexOf(tag) === index)
}

export function formatTaskPriority(priority: TaskPriority) {
  return priority
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function formatTaskStatus(status: TaskStatus) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export type TaskPriorityStyle = { border: string; label: string }

// Full-border priority tint (not a left accent bar, not a filled card) +
// solid label color — terracotta for high/urgent, gold for medium, sage/
// forest green for low, matching the Akadex brand palette. Shared by
// TaskCard and the Dashboard's Recent Tasks so priority reads identically
// everywhere it appears, instead of each surface inventing its own colors.
const TASK_PRIORITY_STYLES: Record<TaskPriority, TaskPriorityStyle> = {
  urgent: { border: "border-terracotta/50 hover:border-terracotta", label: "text-terracotta" },
  high: { border: "border-terracotta/50 hover:border-terracotta", label: "text-terracotta" },
  medium: { border: "border-highlight/50 hover:border-highlight", label: "text-highlight" },
  low: { border: "border-primary/40 hover:border-primary/70", label: "text-primary" },
}

export function getTaskPriorityStyles(priority: string): TaskPriorityStyle {
  return TASK_PRIORITY_STYLES[priority as TaskPriority] ?? TASK_PRIORITY_STYLES.medium
}
