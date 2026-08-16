import type { Metadata } from "next"
import { Geist, Geist_Mono, Nunito_Sans, Silkscreen } from "next/font/google"

import { ThemeProvider } from "@/components/theme/theme-provider"
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

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
const description =
  "Akadex is a cozy academic companion for organizing semesters, tracking grades, planning tasks, focusing with Pomodoro, and understanding academic progress."

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Akadex",
    template: "%s | Akadex",
  },
  description,
  applicationName: "Akadex",
  icons: {
    icon: "/brand/akadex.svg",
    shortcut: "/brand/akadex.svg",
    apple: "/brand/akadex.svg",
  },
  openGraph: {
    title: "Akadex",
    description,
    type: "website",
    siteName: "Akadex",
    images: [
      {
        url: "/brand/hero.webp",
        width: 1672,
        height: 941,
        alt: "Akadex — a cozy academic companion",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Akadex",
    description,
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
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
