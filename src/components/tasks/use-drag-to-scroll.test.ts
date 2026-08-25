import { describe, expect, it } from "vitest"

import { getDragScrollLeft, shouldStartHorizontalDrag } from "@/components/tasks/use-drag-to-scroll"

describe("drag-to-scroll helpers", () => {
  it("calculates scrollLeft from the starting scroll position and pointer delta", () => {
    expect(getDragScrollLeft(120, 300, 250)).toBe(170)
    expect(getDragScrollLeft(120, 300, 340)).toBe(80)
  })

  it("starts only after horizontal movement passes the threshold", () => {
    expect(shouldStartHorizontalDrag(6, 1)).toBe(true)
    expect(shouldStartHorizontalDrag(4, 0)).toBe(false)
  })

  it("does not start for primarily vertical movement", () => {
    expect(shouldStartHorizontalDrag(12, 20)).toBe(false)
    expect(shouldStartHorizontalDrag(6, 6)).toBe(false)
  })
})
