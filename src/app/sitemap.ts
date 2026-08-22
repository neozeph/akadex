import type { MetadataRoute } from "next"

import { publicSitemapRoutes } from "@/lib/seo"

export default function sitemap(): MetadataRoute.Sitemap {
  return publicSitemapRoutes
}
