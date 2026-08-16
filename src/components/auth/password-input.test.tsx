import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import {
  getPasswordInputType,
  getPasswordToggleLabel,
  PasswordInput,
  togglePasswordVisibility,
} from "./password-input"

describe("PasswordInput", () => {
  it("hides passwords by default", () => {
    const markup = renderToStaticMarkup(<PasswordInput id="password" value="secret123" readOnly />)

    expect(markup).toContain('type="password"')
    expect(markup).toContain("Show password")
  })

  it("toggles between text and password types", () => {
    const visible = togglePasswordVisibility(false)

    expect(visible).toBe(true)
    expect(getPasswordInputType(visible)).toBe("text")
    expect(getPasswordToggleLabel(visible)).toBe("Hide password")

    const hidden = togglePasswordVisibility(visible)
    expect(hidden).toBe(false)
    expect(getPasswordInputType(hidden)).toBe("password")
    expect(getPasswordToggleLabel(hidden)).toBe("Show password")
  })

  it("uses a non-submit button and preserves the typed value", () => {
    const markup = renderToStaticMarkup(<PasswordInput id="password" value="secret123" readOnly />)

    expect(markup).toContain('<button type="button"')
    expect(markup).toContain('value="secret123"')
  })
})
