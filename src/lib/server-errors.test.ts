import { describe, expect, it, vi } from "vitest"

import { createPublicError, logServerError, throwPublicError } from "./server-errors"

describe("server error handling", () => {
  it("returns only the provided public message", () => {
    const error = createPublicError("Unable to create the task. Please try again.")

    expect(error.message).toBe("Unable to create the task. Please try again.")
    expect(error.message).not.toContain("tasks_user_id_idx")
  })

  it("does not throw raw database error text to users", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const raw = { message: 'violates row-level security policy for table "tasks"', code: "42501" }

    expect(() => throwPublicError("tasks.create", raw, "Unable to create the task. Please try again.")).toThrow(
      "Unable to create the task. Please try again.",
    )
    expect(() => throwPublicError("tasks.create", raw, "Unable to create the task. Please try again.")).not.toThrow(
      /row-level security|tasks/,
    )

    consoleSpy.mockRestore()
  })

  it("logs sanitized operation context only", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)

    logServerError("analytics.load", {
      message: 'select failed on table "subjects"',
      code: "PGRST116",
    })

    expect(consoleSpy).toHaveBeenCalledWith("Server operation failed", {
      operation: "analytics.load",
      code: "PGRST116",
    })
    expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("subjects")

    consoleSpy.mockRestore()
  })
})
