"use client"

import * as React from "react"

import { type TaskRecord } from "@/components/tasks/task-card"
import { PlannerColumn } from "@/components/tasks/planner-column"
import { type TaskSubjectOption } from "@/components/tasks/task-form-fields"

type TaskBoardProps = {
  tasks: TaskRecord[]
  hasActiveFilters: boolean
  todayISO: string
  subjects: TaskSubjectOption[]
  onCreateTask: (formData: FormData) => Promise<void>
  onDeleteTask: (formData: FormData) => Promise<void>
  onUpdateTask: (formData: FormData) => Promise<void>
  onSetTaskCompletion: (formData: FormData) => Promise<void>
}

type PlannerColumnData = {
  dateISO: string | null
  tasks: TaskRecord[]
}

/**
 * Builds one column per due_date that actually has a visible task, plus a
 * leading `dateISO: null` "No Due Date" column when any exist — no date
 * without a task is ever rendered, and there's no separate horizon/"Later"
 * cutoff: a task's real due_date always gets a real column, however far
 * past or future it is.
 */
function buildPlannerColumns(tasks: TaskRecord[]): PlannerColumnData[] {
  const noDueDate: TaskRecord[] = []
  const byDate = new Map<string, TaskRecord[]>()

  for (const task of tasks) {
    if (!task.due_date) {
      noDueDate.push(task)
      continue
    }
    const bucket = byDate.get(task.due_date) ?? []
    bucket.push(task)
    byDate.set(task.due_date, bucket)
  }

  // Incomplete tasks first within each column; completed ones trail behind
  // with subdued styling so they don't dominate active work. (In Done-only
  // view every task shares the same status, so this is a no-op there.)
  const sortIncompleteFirst = (list: TaskRecord[]) =>
    [...list].sort((a, b) => Number(a.status === "done") - Number(b.status === "done"))

  const columns: PlannerColumnData[] = []

  if (noDueDate.length > 0) {
    columns.push({ dateISO: null, tasks: sortIncompleteFirst(noDueDate) })
  }

  for (const dateISO of Array.from(byDate.keys()).sort()) {
    columns.push({ dateISO, tasks: sortIncompleteFirst(byDate.get(dateISO) ?? []) })
  }

  return columns
}

export function TaskBoard({
  tasks,
  hasActiveFilters,
  todayISO,
  subjects,
  onCreateTask,
  onDeleteTask,
  onUpdateTask,
  onSetTaskCompletion,
}: TaskBoardProps) {
  const columnNodes = React.useRef(new Map<string, HTMLElement>())
  const hasAutoScrolled = React.useRef(false)
  const columns = React.useMemo(() => buildPlannerColumns(tasks), [tasks])

  React.useEffect(() => {
    // Initial scroll position only: land on Today (or the nearest future
    // column) so overdue history doesn't bury it, but don't re-scroll every
    // time the task list changes (e.g. completing a task) — that would
    // yank the view out from under someone mid-session.
    if (hasAutoScrolled.current) return
    hasAutoScrolled.current = true

    const hasOverdueColumns = columns.some((column) => column.dateISO !== null && column.dateISO < todayISO)
    if (!hasOverdueColumns) return

    const target = columns.find((column) => column.dateISO !== null && column.dateISO >= todayISO)
    if (!target?.dateISO) return

    columnNodes.current.get(target.dateISO)?.scrollIntoView({ inline: "start", block: "nearest" })
  }, [columns, todayISO])

  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
        {hasActiveFilters
          ? "No tasks match your search or filters. Try a different title, tag, or clear the filters above."
          : "No active tasks. Use “Add Task” above to create one, or check the Done filter for completed history."}
      </div>
    )
  }

  const cardHandlers = { onUpdateTask, onDeleteTask, onSetTaskCompletion }

  return (
    <section className="space-y-2">
      <h2 className="sr-only">Task planner</h2>
      {/* The only horizontally-scrolling region on the page — the page
          header/filters above stay in normal flow, and this container's
          own overflow-x-auto keeps a wider-than-viewport row of columns
          from ever widening the page itself. */}
      <div
        role="region"
        aria-label="Task planner, scroll horizontally for more dates"
        tabIndex={0}
        className="flex gap-3 overflow-x-auto pb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {columns.map((column) => (
          <PlannerColumn
            key={column.dateISO ?? "no-due-date"}
            ref={(node) => {
              if (!column.dateISO) return
              if (node) {
                columnNodes.current.set(column.dateISO, node)
              } else {
                columnNodes.current.delete(column.dateISO)
              }
            }}
            dateISO={column.dateISO}
            isToday={column.dateISO === todayISO}
            isOverdue={column.dateISO !== null && column.dateISO < todayISO}
            tasks={column.tasks}
            subjects={subjects}
            onCreateTask={onCreateTask}
            {...cardHandlers}
          />
        ))}
      </div>
    </section>
  )
}
