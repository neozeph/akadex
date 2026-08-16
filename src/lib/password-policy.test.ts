import { describe, expect, it } from "vitest"

import {
  getPasswordLengthMessage,
  MIN_PASSWORD_LENGTH,
  validatePasswordConfirmation,
  validatePasswordLength,
} from "./password-policy"

describe("password policy", () => {
  it("rejects six- and seven-character passwords", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8)
    expect(validatePasswordLength("123456")).toBe(false)
    expect(validatePasswordLength("1234567")).toBe(false)
  })

  it("accepts eight-character passwords", () => {
    expect(validatePasswordLength("12345678")).toBe(true)
  })

  it("keeps confirmation mismatch rejected", () => {
    expect(validatePasswordConfirmation("12345678", "12345679")).toBe(false)
    expect(validatePasswordConfirmation("12345678", "12345678")).toBe(true)
  })

  it("uses useful safe validation copy", () => {
    expect(getPasswordLengthMessage()).toBe("Password must be at least 8 characters.")
  })
})
