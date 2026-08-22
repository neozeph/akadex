import { describe, expect, it } from "vitest"

import authLayout, { metadata as authMetadata } from "@/app/(auth)/layout"
import dashboardLayout, { metadata as dashboardMetadata } from "@/app/(dashboard)/layout"
import robots from "@/app/robots"
import sitemap from "@/app/sitemap"
import { createRootMetadata, privateRobotsDisallow, publicSitemapRoutes, siteDescription, siteUrl } from "@/lib/seo"

describe("SEO route configuration", () => {
  it("builds root metadata for public indexing and social previews", () => {
    const metadata = createRootMetadata("google-token")

    expect(metadata.metadataBase).toEqual(new URL(siteUrl))
    expect(metadata.title).toEqual({
      default: "Akadex - Academic Companion for Students",
      template: "%s | Akadex",
    })
    expect(metadata.description).toBe(siteDescription)
    expect(metadata.alternates).toEqual({ canonical: "/" })
    expect(metadata.robots).toMatchObject({
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    })
    expect(metadata.verification).toEqual({ google: "google-token" })
    expect(metadata.openGraph).toMatchObject({
      title: "Akadex - Academic Companion for Students",
      description: siteDescription,
      url: "/",
      siteName: "Akadex",
    })
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      title: "Akadex - Academic Companion for Students",
    })
  })

  it("omits Google verification metadata when no token is configured", () => {
    expect(createRootMetadata().verification).toBeUndefined()
  })

  it("generates a sitemap for canonical public pages only", () => {
    const urls = sitemap().map((entry) => entry.url)

    expect(urls).toEqual([
      siteUrl,
      `${siteUrl}/about`,
      `${siteUrl}/faq`,
      `${siteUrl}/changelog`,
      `${siteUrl}/contact`,
      `${siteUrl}/privacy`,
      `${siteUrl}/terms`,
    ])

    expect(urls.some((url) => /\/(login|register|dashboard|settings|auth\/callback)/.test(url))).toBe(false)
    expect(publicSitemapRoutes.every((entry) => entry.lastModified === undefined)).toBe(true)
  })

  it("generates robots rules that allow public pages and exclude private surfaces", () => {
    const generated = robots()

    expect(generated).toEqual({
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: privateRobotsDisallow,
      },
      sitemap: `${siteUrl}/sitemap.xml`,
    })

    expect(privateRobotsDisallow).toEqual(
      expect.arrayContaining([
        "/api/",
        "/auth/",
        "/auth/callback",
        "/login",
        "/register",
        "/forgot-password",
        "/update-password",
        "/dashboard",
        "/tasks",
        "/semesters",
        "/pomodoro",
        "/analytics",
        "/settings",
        "/account",
        "/profile",
      ]),
    )
  })

  it("marks auth and authenticated route groups as noindex", () => {
    expect(authMetadata.robots).toEqual({
      index: false,
      follow: false,
    })
    expect(dashboardMetadata.robots).toEqual({
      index: false,
      follow: false,
    })
  })

  it("keeps route group layouts transparent", () => {
    const children = "content"

    expect(authLayout({ children })).toBe(children)
    expect(dashboardLayout).toBeTypeOf("function")
  })
})
