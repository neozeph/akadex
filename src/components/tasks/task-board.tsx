"use client"

import { TaskCard, type TaskRecord } from "@/components/tasks/task-card"

type TaskBoardProps = {
  tasks: TaskRecord[]
  hasActiveFilters: boolean
  todayISO: string
  tomorrowISO: string
  onDeleteTask: (formData: FormData) => Promise<void>
  onUpdateTask: (formData: FormData) => Promise<void>
  onSetTaskCompletion: (formData: FormData) => Promise<void>
}

type TaskGroup = {
  key: string
  label: string
  tasks: TaskRecord[]
}

/**
 * Buckets tasks into date-based groups using only string comparisons
 * against server-supplied anchor dates (todayISO/tomorrowISO) — no
 * `Date` object construction or timezone math happens here, so this is
 * safe to run identically during SSR and the first client render.
 */
function groupTasks(tasks: TaskRecord[], todayISO: string, tomorrowISO: string): TaskGroup[] {
  const buckets: Record<string, TaskRecord[]> = {
    overdue: [],
    today: [],
    tomorrow: [],
    upcoming: [],
    "no-due-date": [],
  }

  for (const task of tasks) {
    if (!task.due_date) {
      buckets["no-due-date"].push(task)
    } else if (task.due_date < todayISO) {
      buckets.overdue.push(task)
    } else if (task.due_date === todayISO) {
      buckets.today.push(task)
    } else if (task.due_date === tomorrowISO) {
      buckets.tomorrow.push(task)
    } else {
      buckets.upcoming.push(task)
    }
  }

  // Incomplete tasks first within each group; completed ones trail behind
  // with subdued styling so they don't dominate active work.
  const sortIncompleteFirst = (list: TaskRecord[]) =>
    [...list].sort((a, b) => Number(a.status === "done") - Number(b.status === "done"))

  return [
    { key: "overdue", label: "Overdue", tasks: sortIncompleteFirst(buckets.overdue) },
    { key: "today", label: "Today", tasks: sortIncompleteFirst(buckets.today) },
    { key: "tomorrow", label: "Tomorrow", tasks: sortIncompleteFirst(buckets.tomorrow) },
    { key: "upcoming", label: "Upcoming", tasks: sortIncompleteFirst(buckets.upcoming) },
    { key: "no-due-date", label: "No Due Date", tasks: sortIncompleteFirst(buckets["no-due-date"]) },
  ].filter((group) => group.tasks.length > 0)
}

export function TaskBoard({
  tasks,
  hasActiveFilters,
  todayISO,
  tomorrowISO,
  onDeleteTask,
  onUpdateTask,
  onSetTaskCompletion,
}: TaskBoardProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
        {hasActiveFilters
          ? "No tasks match your search or filters. Try a different title, tag, or clear the filters above."
          : "No tasks yet. Use “Add Task” above to create your first one."}
      </div>
    )
  }

  const groups = groupTasks(tasks, todayISO, tomorrowISO)

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section key={group.key} className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="font-accent text-xs font-semibold tracking-[0.1em] text-foreground uppercase">
              {group.label}
            </h2>
            <span className="text-xs font-medium text-muted-foreground">{group.tasks.length}</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {group.tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onUpdateTask={onUpdateTask}
                onDeleteTask={onDeleteTask}
                onSetTaskCompletion={onSetTaskCompletion}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
