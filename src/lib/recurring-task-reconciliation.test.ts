import { describe, expect, it } from "vitest"

import { planRecurringTaskReconciliation, type ReconciliationTask } from "@/lib/recurring-task-reconciliation"

const task = (overrides: Partial<ReconciliationTask>): ReconciliationTask => ({
  id: "task",
  series_id: "series-1",
  status: "todo",
  due_date: "2026-09-05",
  created_at: "2026-01-01T00:00:00.000Z",
  ...overrides,
})

describe("planRecurringTaskReconciliation", () => {
  it("reduces a legacy recurring series with overdue and future active rows to one active row", () => {
    const decisions = planRecurringTaskReconciliation(
      [
        task({ id: "sep-2", due_date: "2026-09-02" }),
        task({ id: "sep-3", due_date: "2026-09-03" }),
        task({ id: "sep-5", due_date: "2026-09-05" }),
        task({ id: "sep-6", due_date: "2026-09-06" }),
      ],
      "2026-09-05",
    )

    expect(decisions).toHaveLength(4)
    expect(decisions.find((decision) => decision.cleanup_action === "retain")?.id).toBe("sep-2")
    expect(decisions.filter((decision) => decision.cleanup_action === "remove").map((decision) => decision.id)).toEqual([
      "sep-3",
      "sep-5",
      "sep-6",
    ])
  })

  it("preserves completed historical rows by excluding them from cleanup decisions", () => {
    const decisions = planRecurringTaskReconciliation(
      [
        task({ id: "completed", status: "done", due_date: "2026-09-01" }),
        task({ id: "active-1", due_date: "2026-09-02" }),
        task({ id: "active-2", due_date: "2026-09-03" }),
      ],
      "2026-09-05",
    )

    expect(decisions.map((decision) => decision.id)).toEqual(["active-1", "active-2"])
    expect(decisions.find((decision) => decision.id === "active-1")?.cleanup_action).toBe("retain")
  })

  it("retains the nearest upcoming row when a series has only future active rows", () => {
    const decisions = planRecurringTaskReconciliation(
      [
        task({ id: "sep-8", due_date: "2026-09-08" }),
        task({ id: "sep-6", due_date: "2026-09-06" }),
      ],
      "2026-09-05",
    )

    expect(decisions.find((decision) => decision.cleanup_action === "retain")?.id).toBe("sep-6")
  })

  it("leaves non-recurring tasks untouched", () => {
    const decisions = planRecurringTaskReconciliation(
      [
        task({ id: "normal-1", series_id: null, due_date: "2026-09-02" }),
        task({ id: "normal-2", series_id: null, due_date: "2026-09-03" }),
      ],
      "2026-09-05",
    )

    expect(decisions).toEqual([])
  })

  it("is idempotent after remove decisions are applied", () => {
    const source = [
      task({ id: "sep-2", due_date: "2026-09-02" }),
      task({ id: "sep-3", due_date: "2026-09-03" }),
      task({ id: "sep-6", due_date: "2026-09-06" }),
    ]
    const firstPass = planRecurringTaskReconciliation(source, "2026-09-05")
    const remaining = source.filter(
      (candidate) => firstPass.find((decision) => decision.id === candidate.id)?.cleanup_action !== "remove",
    )

    expect(planRecurringTaskReconciliation(remaining, "2026-09-05")).toEqual([])
  })
})
