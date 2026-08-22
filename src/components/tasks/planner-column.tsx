import type * as React from "react"
import { Plus } from "lucide-react"

import { formatColumnMonthDay, formatColumnWeekday, formatFullDate } from "@/lib/dates"
import { TaskCard, type TaskRecord } from "@/components/tasks/task-card"
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog"
import { type TaskSubjectOption } from "@/components/tasks/task-form-fields"
import { cn } from "@/lib/utils"

type PlannerColumnProps = {
  ref?: React.Ref<HTMLElement>
  title: string
  /** null renders the leading "No Due Date" column instead of a dated one. */
  dateISO: string | null
  isToday: boolean
  isOverdue: boolean
  tasks: TaskRecord[]
  subjects: TaskSubjectOption[]
  getTaskDueDateLabel?: (task: TaskRecord) => string | null
  onCreateTask: (formData: FormData) => Promise<void>
  onUpdateTask: (formData: FormData) => Promise<void>
  onDeleteTask: (formData: FormData) => Promise<void>
  onSetTaskCompletion: (formData: FormData) => Promise<void>
}

/**
 * A single planner column — either a calendar date or the leading "No Due
 * Date" bucket. Purely presentational — bucketing, sorting, and the
 * horizontal scroll container all live in TaskBoard.
 *
 * The header reserves a fixed min-height so the single-line "No Due Date"
 * label lines up with the two-line weekday/date headers on dated columns —
 * that's what keeps every column top-aligned and gives them a consistent
 * header height regardless of content. Below it, the task list and the
 * "+ Add task" quick-add sit together in one vertical scroll region
 * region: quick-add renders as the last item right after the final task, so
 * a sparse column stays naturally short instead of stretching to push it to
 * a fixed bottom, and a busy column scrolls the whole region — tasks and
 * quick-add together — until quick-add comes into view.
 */
export function PlannerColumn({
  ref,
  title,
  dateISO,
  isToday,
  isOverdue,
  tasks,
  subjects,
  getTaskDueDateLabel,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onSetTaskCompletion,
}: PlannerColumnProps) {
  const headingId = `planner-column-${dateISO ?? title.toLowerCase().replace(/\s+/g, "-")}`
  const quickAddLabel = dateISO ? `Add task for ${formatFullDate(dateISO)}` : "Add task without due date"

  return (
    <section
      ref={ref}
      aria-labelledby={headingId}
      className="flex w-[260px] max-w-[260px] shrink-0 flex-col gap-2 overflow-x-hidden sm:w-[280px] sm:max-w-[280px]"
    >
      <header
        className={cn(
          "flex min-h-11 shrink-0 flex-col justify-end border-b pb-2",
          isToday ? "border-primary" : "border-border",
        )}
      >
        {dateISO === null ? (
          <h3
            id={headingId}
            className={cn(
              "font-accent text-sm font-semibold tracking-[0.05em] uppercase",
              isOverdue ? "text-terracotta" : "text-foreground",
            )}
          >
            {title}
          </h3>
        ) : (
          <>
            {isToday || isOverdue ? (
              <p
                className={cn(
                  "font-accent text-[0.65rem] font-semibold tracking-[0.1em] uppercase",
                  isToday ? "text-primary" : "text-terracotta",
                )}
              >
                {formatColumnWeekday(dateISO)} · {isToday ? "Today" : "Overdue"}
              </p>
            ) : (
              <p className="font-accent text-[0.65rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                {formatColumnWeekday(dateISO)}
              </p>
            )}
            <h3
              id={headingId}
              className={cn(
                "font-accent text-sm font-semibold tracking-[0.05em] uppercase",
                isToday ? "text-primary" : "text-foreground",
              )}
            >
              {formatColumnMonthDay(dateISO)}
            </h3>
          </>
        )}
      </header>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto">
        {tasks.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
            No tasks
          </p>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              subjects={subjects}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              onSetTaskCompletion={onSetTaskCompletion}
              dueDateLabel={getTaskDueDateLabel?.(task)}
            />
          ))
        )}

        <CreateTaskDialog
          onCreate={onCreateTask}
          subjects={subjects}
          initialDueDate={isOverdue ? "" : (dateISO ?? "")}
          trigger={
            <button
              type="button"
              aria-label={quickAddLabel}
              className="flex w-full shrink-0 items-center justify-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-2 text-xs font-medium text-muted-foreground transition hover:border-transparent hover:bg-accent hover:text-accent-foreground"
            >
              <Plus className="size-3.5" />
              Add task
            </button>
          }
        />
      </div>
    </section>
  )
}
