import { describe, expect, it } from "vitest"

import {
  authenticatedNoStoreHeader,
  createContentSecurityPolicy,
  createSecurityHeaders,
  securityHeaders,
} from "./security-headers"

describe("security headers", () => {
  it("sets clickjacking, sniffing, referrer, and permissions protections", () => {
    expect(securityHeaders).toContainEqual({
      key: "X-Content-Type-Options",
      value: "nosniff",
    })
    expect(securityHeaders).toContainEqual({
      key: "X-Frame-Options",
      value: "DENY",
    })
    expect(securityHeaders).toContainEqual({
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    })
    expect(securityHeaders.find((header) => header.key === "Permissions-Policy")?.value).toContain("camera=()")
  })

  it("enables HSTS only for production HTTPS deployment headers", () => {
    expect(createSecurityHeaders(true)).toContainEqual({
      key: "Strict-Transport-Security",
      value: "max-age=31536000",
    })
    expect(createSecurityHeaders(false).some((header) => header.key === "Strict-Transport-Security")).toBe(false)
  })

  it("uses a restrictive CSP without broad wildcards or production unsafe-eval", () => {
    const productionCsp = createContentSecurityPolicy(true)

    expect(productionCsp).toContain("default-src 'self'")
    expect(productionCsp).toContain("frame-ancestors 'none'")
    expect(productionCsp).toContain("object-src 'none'")
    expect(productionCsp).not.toContain("default-src *")
    expect(productionCsp).not.toContain("frame-ancestors *")
    expect(productionCsp).not.toContain("'unsafe-eval'")
  })

  it("allows local development websocket connections only outside production", () => {
    expect(createContentSecurityPolicy(false)).toContain("ws://localhost:*")
    expect(createContentSecurityPolicy(true)).not.toContain("ws://localhost:*")
  })

  it("marks authenticated responses as private no-store", () => {
    expect(authenticatedNoStoreHeader).toEqual({
      key: "Cache-Control",
      value: "private, no-store",
    })
  })
})
