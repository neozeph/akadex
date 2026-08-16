"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { ArrowRight, Menu, X } from "lucide-react"

import { BrandMark } from "@/components/brand/brand-mark"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const links = [
  { label: "Features", href: "#features" },
  { label: "Journey", href: "#journey" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "/contact" },
]

/**
 * Sticky, full-width bar (not a floating rounded pill) so it stays above
 * Hero/screenshots/features/journey/about while scrolling. `sticky` keeps it
 * in normal document flow — it reserves its own height right before Hero,
 * so there's no overlap/jump to compensate for and no fixed-position offset
 * math needed elsewhere on the page.
 *
 * `compact` only starts as `false` on both server and client (deterministic
 * initial render); the real scroll position is read in an effect after
 * mount, same pattern as the rest of the landing page's motion, so this
 * never causes a hydration mismatch.
 */
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
      className={cn(
        "sticky top-0 z-40 w-full border-b transition-colors duration-300",
        compact
          ? "border-border/70 bg-background/90 shadow-soft backdrop-blur-xl"
          : "border-transparent bg-background/40 backdrop-blur-sm",
      )}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href={resolveHref("#top")}
          onClick={handleNavigation}
          className="flex cursor-pointer items-center gap-3 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
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
              Sign In
            </Button>
          </Link>
          <Link href="/register" className="hidden sm:inline-flex">
            <Button size="sm" className="gap-1.5">
              Get Started
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
        <div className="border-t border-border/70 bg-background/95 backdrop-blur-xl md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 sm:px-6">
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
            <Link
              href="/login"
              className="rounded-2xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
              onClick={handleNavigation}
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-2xl bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
              onClick={handleNavigation}
            >
              Get Started
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  )
}
