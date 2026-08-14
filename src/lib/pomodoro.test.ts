import { describe, expect, it } from "vitest"
import { formatFocusDuration, formatFocusMinutes } from "@/lib/pomodoro"

describe("formatFocusDuration", () => {
  it("shows minutes only under an hour", () => {
    expect(formatFocusDuration(45 * 60)).toBe("45m")
  })

  it("shows hours only on an exact hour", () => {
    expect(formatFocusDuration(2 * 60 * 60)).toBe("2h")
  })

  it("shows hours and minutes together", () => {
    expect(formatFocusDuration(6 * 60 * 60 + 20 * 60)).toBe("6h 20m")
  })

  it("rounds to the nearest minute rather than truncating", () => {
    // 90 seconds -> 1.5 minutes, rounds up to 2m, not down to 1m.
    expect(formatFocusDuration(90)).toBe("2m")
  })

  it("handles zero", () => {
    expect(formatFocusDuration(0)).toBe("0m")
  })
})

describe("formatFocusMinutes", () => {
  it("converts seconds to a rounded minute count", () => {
    expect(formatFocusMinutes(42 * 60)).toBe("42 min")
  })

  it("a single custom 1-minute session stays 1 minute, not a default 25", () => {
    expect(formatFocusMinutes(60)).toBe("1 min")
  })
})
