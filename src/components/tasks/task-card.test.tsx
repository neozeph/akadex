import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { TaskCard, type TaskRecord } from "@/components/tasks/task-card"

const baseTask: TaskRecord = {
  id: "task-1",
  title: "Daily Review",
  description: null,
  tags: [],
  due_date: "2026-09-05",
  priority: "medium",
  status: "todo",
  subject_id: null,
  series_id: null,
  recurrence_type: null,
  subject: null,
}

const handlers = {
  onUpdateTask: vi.fn(),
  onDeleteTask: vi.fn(),
  onSetTaskCompletion: vi.fn(),
}

describe("TaskCard recurrence indicator", () => {
  it("renders a repeat label only for recurring tasks", () => {
    const recurringMarkup = renderToStaticMarkup(
      <TaskCard
        task={{ ...baseTask, series_id: "series-1", recurrence_type: "daily" }}
        subjects={[]}
        {...handlers}
      />,
    )
    const normalMarkup = renderToStaticMarkup(<TaskCard task={baseTask} subjects={[]} {...handlers} />)

    expect(recurringMarkup).toContain("Repeats daily")
    expect(normalMarkup).not.toContain("Repeats daily")
  })
})
