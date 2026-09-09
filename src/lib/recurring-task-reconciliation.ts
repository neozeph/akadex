export type ReconciliationTask = {
  id: string
  series_id: string | null
  status: string
  due_date: string | null
  created_at: string
}

export type ReconciliationDecision = ReconciliationTask & {
  active_count: number
  cleanup_action: "retain" | "remove"
}

function activeDueRank(task: ReconciliationTask, todayISO: string) {
  if (task.due_date === null) return 2
  return task.due_date <= todayISO ? 0 : 1
}

export function compareRecurringActiveTasks(
  a: ReconciliationTask,
  b: ReconciliationTask,
  todayISO: string,
) {
  const dueRankDiff = activeDueRank(a, todayISO) - activeDueRank(b, todayISO)
  if (dueRankDiff !== 0) return dueRankDiff

  if (a.due_date !== b.due_date) {
    if (a.due_date === null) return 1
    if (b.due_date === null) return -1

    if (a.due_date <= todayISO && b.due_date <= todayISO) {
      return a.due_date.localeCompare(b.due_date)
    }

    return a.due_date.localeCompare(b.due_date)
  }

  const createdDiff = a.created_at.localeCompare(b.created_at)
  if (createdDiff !== 0) return createdDiff

  return a.id.localeCompare(b.id)
}

export function planRecurringTaskReconciliation(
  tasks: ReconciliationTask[],
  todayISO: string,
): ReconciliationDecision[] {
  const activeBySeries = new Map<string, ReconciliationTask[]>()

  for (const task of tasks) {
    if (!task.series_id || task.status === "done") {
      continue
    }

    activeBySeries.set(task.series_id, [...(activeBySeries.get(task.series_id) ?? []), task])
  }

  return Array.from(activeBySeries.values()).flatMap((seriesTasks) => {
    if (seriesTasks.length <= 1) {
      return []
    }

    const ranked = [...seriesTasks].sort((a, b) => compareRecurringActiveTasks(a, b, todayISO))
    const retainedId = ranked[0].id

    return ranked.map((task) => ({
      ...task,
      active_count: ranked.length,
      cleanup_action: task.id === retainedId ? "retain" : "remove",
    }))
  })
}
