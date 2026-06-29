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
