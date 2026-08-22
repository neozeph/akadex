import type { Metadata, MetadataRoute } from "next"

export const siteUrl = "https://akadex.vercel.app"

export const siteDescription =
  "Akadex is a cozy academic companion for students to track grades, calculate GWA, organize academic tasks, and stay focused."

export function createRootMetadata(googleSiteVerification?: string): Metadata {
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: "Akadex - Academic Companion for Students",
      template: "%s | Akadex",
    },
    description: siteDescription,
    keywords: [
      "Akadex",
      "GWA calculator",
      "grade tracker",
      "student planner",
      "academic tracker",
      "study companion",
      "Philippines",
    ],
    applicationName: "Akadex",
    alternates: {
      canonical: "/",
    },
    icons: {
      icon: "/brand/akadex.svg",
      shortcut: "/brand/akadex.svg",
      apple: "/brand/akadex.svg",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    verification: googleSiteVerification
      ? {
          google: googleSiteVerification,
        }
      : undefined,
    openGraph: {
      title: "Akadex - Academic Companion for Students",
      description: siteDescription,
      type: "website",
      siteName: "Akadex",
      url: "/",
      locale: "en_US",
      images: [
        {
          url: "/brand/hero.webp",
          width: 1672,
          height: 941,
          alt: "Akadex - a cozy academic companion",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Akadex - Academic Companion for Students",
      description: siteDescription,
      images: ["/brand/hero.webp"],
    },
  }
}

export const publicSitemapRoutes: MetadataRoute.Sitemap = [
  {
    url: siteUrl,
    changeFrequency: "monthly",
    priority: 1,
  },
  {
    url: `${siteUrl}/about`,
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    url: `${siteUrl}/faq`,
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    url: `${siteUrl}/changelog`,
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    url: `${siteUrl}/contact`,
    changeFrequency: "yearly",
    priority: 0.5,
  },
  {
    url: `${siteUrl}/privacy`,
    changeFrequency: "yearly",
    priority: 0.4,
  },
  {
    url: `${siteUrl}/terms`,
    changeFrequency: "yearly",
    priority: 0.4,
  },
]

export const privateRobotsDisallow = [
  "/api/",
  "/auth/",
  "/auth/callback",
  "/login",
  "/register",
  "/forgot-password",
  "/update-password",
  "/dashboard",
  "/dashboard/",
  "/tasks",
  "/tasks/",
  "/semesters",
  "/semesters/",
  "/pomodoro",
  "/pomodoro/",
  "/analytics",
  "/analytics/",
  "/settings",
  "/settings/",
  "/account",
  "/account/",
  "/profile",
  "/profile/",
]
