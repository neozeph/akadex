"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { GitBranch, Heart } from "lucide-react"

import { BrandMark } from "@/components/brand/brand-mark"
import { ThemeToggle } from "@/components/theme/theme-toggle"

const footerLinks = [
  { label: "Features", href: "#features" },
  { label: "About", href: "#about" },
  { label: "Login", href: "/login" },
  { label: "Register", href: "/register" },
]

const resources = [
  { label: "GitHub", href: "https://github.com/neozeph/akadeks" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
]

export function Footer() {
  const pathname = usePathname()
  const resolveHref = (href: string) => (href.startsWith("#") && pathname !== "/" ? `/${href}` : href)

  return (
    <footer className="border-t border-border/70 bg-background/70 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-md">
          <BrandMark subtitle="A calm, guided space for academic growth" />
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            Build habits, organize your semesters, and turn every study session into meaningful progress.
          </p>
        </div>

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-foreground">Navigate</p>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              {footerLinks.map((link) => (
                <li key={link.label}>
                  <Link href={resolveHref(link.href)} className="transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-foreground">Resources</p>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              {resources.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-foreground">Theme</p>
            <div className="mt-4">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 flex max-w-7xl flex-col gap-3 border-t border-border/70 pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 Akadeks. Made with <Heart className="inline size-4 text-rose-500" /> by Josef.</p>
        <a href="https://github.com/neozeph/akadeks" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-foreground">
          <GitBranch className="size-4" />
          GitHub
        </a>
      </div>
    </footer>
  )
}
