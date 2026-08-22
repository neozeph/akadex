import type { MetadataRoute } from "next"

import { privateRobotsDisallow, siteUrl } from "@/lib/seo"

/**
 * Keeps the authenticated app surface (dashboard and its sub-routes, the
 * auth entry points, callbacks, and API endpoints out of crawler discovery,
 * while leaving the public marketing and policy pages crawlable.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: privateRobotsDisallow,
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
