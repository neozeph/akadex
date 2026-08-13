"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { ArrowRight, Menu, X } from "lucide-react"

import { BrandMark } from "@/components/brand/brand-mark"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { Button } from "@/components/ui/button"

const links = [
  { label: "Features", href: "#features" },
  { label: "Journey", href: "#journey" },
  { label: "About", href: "#about" },
]

export function Navbar() {
  const pathname = usePathname()
  const [compact, setCompact] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })

    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const resolveHref = useMemo(
    () => (href: string) => (href.startsWith("#") && pathname !== "/" ? `/${href}` : href),
    [pathname],
  )

  const handleNavigation = () => setOpen(false)

  return (
    <header
      className={`sticky top-4 z-50 mx-auto w-full max-w-7xl px-4 transition-all duration-300 sm:px-6 lg:px-8 ${compact ? "top-3" : "top-4"}`}
    >
      <div className="rounded-[1.6rem] border border-border/70 bg-background/75 px-3 py-2.5 shadow-soft backdrop-blur-xl sm:px-4 sm:py-3">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            <BrandMark showLabel={false} className="gap-2" />
            <span className="font-accent text-sm font-semibold uppercase tracking-[0.2em] text-foreground">AKADEX</span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex" aria-label="Primary navigation">
            {links.map((link) => (
              <Link
                key={link.href}
                href={resolveHref(link.href)}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                onClick={handleNavigation}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link href="/login" className="hidden sm:inline-flex">
              <Button variant="ghost" size="sm">
                Login
              </Button>
            </Link>
            <Link href="/register" className="hidden sm:inline-flex">
              <Button size="sm" className="gap-1.5">
                Start
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Button
              variant="outline"
              size="icon"
              className="md:hidden"
              aria-label="Toggle navigation menu"
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X className="size-4" /> : <Menu className="size-4" />}
            </Button>
          </div>
        </div>

        {open ? (
          <div className="mt-3 flex flex-col gap-3 rounded-[1.25rem] border border-border/70 bg-background/95 p-3 md:hidden">
            {links.map((link) => (
              <Link
                key={link.href}
                href={resolveHref(link.href)}
                className="rounded-2xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                onClick={handleNavigation}
              >
                {link.label}
              </Link>
            ))}
            <Link href="/login" className="rounded-2xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground" onClick={handleNavigation}>
              Login
            </Link>
            <Link href="/register" className="rounded-2xl bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/15 dark:text-emerald-300" onClick={handleNavigation}>
              Start Adventure
            </Link>
          </div>
        ) : null}
      </div>
    </header>
  )
}
