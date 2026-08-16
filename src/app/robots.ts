import type { MetadataRoute } from "next"

/**
 * Keeps the authenticated app surface (dashboard and its sub-routes, the
 * OAuth/email callback endpoint) out of search results, while leaving the
 * public marketing pages and auth entry points (login/register/etc.)
 * indexable.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/tasks", "/semesters", "/pomodoro", "/analytics", "/settings", "/auth/"],
    },
  }
}
