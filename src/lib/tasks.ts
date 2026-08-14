export const TASK_PRIORITY_OPTIONS = ["low", "medium", "high", "urgent"] as const
export const TASK_STATUS_OPTIONS = ["todo", "in_progress", "done"] as const

export type TaskPriority = (typeof TASK_PRIORITY_OPTIONS)[number]
export type TaskStatus = (typeof TASK_STATUS_OPTIONS)[number]

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
