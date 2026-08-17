import type { Metadata } from "next"
import { Geist, Geist_Mono, Nunito_Sans, Silkscreen } from "next/font/google"

import { ThemeProvider } from "@/components/theme/theme-provider"
import { siteDescription, siteUrl } from "@/lib/seo"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito",
  subsets: ["latin"],
})

const silkscreen = Silkscreen({
  variable: "--font-silkscreen",
  weight: ["400", "700"],
  subsets: ["latin"],
})

const googleSiteVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION

export const metadata: Metadata = {
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${nunitoSans.variable} ${silkscreen.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Akadex",
              url: siteUrl,
              description: siteDescription,
            }),
          }}
        />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
