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

export const metadata: Metadata = {
  title: "Akadex",
  description: "Student productivity and academic management platform",
  icons: {
    icon: "/brand/akadex.svg",
    shortcut: "/brand/akadex.svg",
    apple: "/brand/akadex.svg",
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
