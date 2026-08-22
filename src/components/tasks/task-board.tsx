"use client"

import * as React from "react"

import { type TaskRecord } from "@/components/tasks/task-card"
import { PlannerColumn } from "@/components/tasks/planner-column"
import { type TaskSubjectOption } from "@/components/tasks/task-form-fields"
import { formatColumnMonthDay } from "@/lib/dates"

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
  id: string
  title: string
  dateISO: string | null
  isOverdueColumn?: boolean
  tasks: TaskRecord[]
}

/**
 * Builds populated planner columns only: one Overdue bucket for all past
 * due dates, then No Due Date, Today, and future dates in ascending order.
 */
function buildPlannerColumns(tasks: TaskRecord[], todayISO: string): PlannerColumnData[] {
  const overdue: TaskRecord[] = []
  const noDueDate: TaskRecord[] = []
  const byDate = new Map<string, TaskRecord[]>()

  for (const task of tasks) {
    if (!task.due_date) {
      noDueDate.push(task)
      continue
    }
    if (task.due_date < todayISO) {
      overdue.push(task)
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

  if (overdue.length > 0) {
    columns.push({
      id: "overdue",
      title: "Overdue",
      dateISO: null,
      isOverdueColumn: true,
      tasks: sortIncompleteFirst(overdue).sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? "")),
    })
  }

  if (noDueDate.length > 0) {
    columns.push({ id: "no-due-date", title: "No Due Date", dateISO: null, tasks: sortIncompleteFirst(noDueDate) })
  }

  for (const dateISO of Array.from(byDate.keys()).sort()) {
    columns.push({ id: dateISO, title: "", dateISO, tasks: sortIncompleteFirst(byDate.get(dateISO) ?? []) })
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
  const columns = React.useMemo(() => buildPlannerColumns(tasks, todayISO), [tasks, todayISO])

  React.useEffect(() => {
    // Initial scroll position only: land on Today (or the nearest future
    // column) so overdue history doesn't bury it, but don't re-scroll every
    // time the task list changes (e.g. completing a task) — that would
    // yank the view out from under someone mid-session.
    if (hasAutoScrolled.current) return
    hasAutoScrolled.current = true

    const hasOverdueColumns = columns.some((column) => column.isOverdueColumn)
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
        className="min-h-[calc(100vh-18rem)] overflow-x-auto pb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex min-w-max items-stretch gap-3">
          {columns.map((column) => (
            <PlannerColumn
              key={column.id}
              ref={(node) => {
                if (!column.dateISO) return
                if (node) {
                  columnNodes.current.set(column.dateISO, node)
                } else {
                  columnNodes.current.delete(column.dateISO)
                }
              }}
              title={column.title}
              dateISO={column.dateISO}
              isToday={column.dateISO === todayISO}
              isOverdue={Boolean(column.isOverdueColumn)}
              tasks={column.tasks}
              subjects={subjects}
              onCreateTask={onCreateTask}
              getTaskDueDateLabel={
                column.isOverdueColumn ? (task) => (task.due_date ? formatColumnMonthDay(task.due_date) : null) : undefined
              }
              {...cardHandlers}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
