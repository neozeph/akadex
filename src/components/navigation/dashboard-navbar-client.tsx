"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChartNoAxesCombined, LayoutDashboard, NotebookTabs, Settings2, SquareCheckBig, TimerReset } from "lucide-react"

import { BrandMark } from "@/components/brand/brand-mark"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { cn } from "@/lib/utils"

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: SquareCheckBig },
  { href: "/semesters", label: "Semesters", icon: NotebookTabs },
  { href: "/pomodoro", label: "Pomodoro", icon: TimerReset },
  { href: "/analytics", label: "Analytics", icon: ChartNoAxesCombined },
  { href: "/settings", label: "Settings", icon: Settings2 },
]

// The bottom tab bar is a fixed 4-column grid sized for the highest-
// frequency destinations — adding a 5th item would cram it. Analytics (like
// Settings) is instead reachable from the mobile top bar's icon row below.
const mobileTabs = links.filter((link) => link.href !== "/settings" && link.href !== "/analytics")

type DashboardNavbarClientProps = {
  displayName: string
  initials: string
}

export function DashboardNavbarClient({ displayName, initials }: DashboardNavbarClientProps) {
  const pathname = usePathname()

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-border/70 bg-[linear-gradient(180deg,color-mix(in_oklch,var(--background)_94%,var(--primary)_6%),var(--background))] lg:flex lg:h-screen lg:flex-col">
        <div className="flex flex-1 flex-col gap-4 p-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/70 p-3 shadow-[0_16px_30px_-28px_rgba(15,23,42,0.35)] backdrop-blur-xl"
          >
            <BrandMark showLabel={false} />
            <div className="min-w-0 leading-tight">
              <p className="font-accent text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
                AKADEX
              </p>
              <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
            </div>
            <div className="ml-auto flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {initials}
            </div>
          </Link>

          <nav className="flex flex-1 flex-col gap-1">
            {links.map((link) => {
              const active = pathname === link.href
              const Icon = link.icon

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-11 w-full items-center gap-3 rounded-2xl border px-4 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                    active
                      ? "border-primary/50 bg-accent text-primary"
                      : "border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {link.label}
                </Link>
              )
            })}
          </nav>

          <div className="grid gap-2 border-t border-border/60 pt-4">
            <SignOutButton className="w-full justify-center" />
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <BrandMark showLabel={false} />
            <span className="font-accent text-sm font-semibold tracking-[0.15em] text-foreground uppercase">
              AKADEX
            </span>
          </Link>

          <div className="flex items-center gap-1.5">
            <Link
              href="/analytics"
              aria-label="Analytics"
              aria-current={pathname === "/analytics" ? "page" : undefined}
              className={cn(
                "flex size-8 items-center justify-center rounded-xl border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                pathname === "/analytics"
                  ? "border-primary/50 bg-accent text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground",
              )}
            >
              <ChartNoAxesCombined className="size-4" />
            </Link>
            <Link
              href="/settings"
              aria-label="Settings"
              aria-current={pathname === "/settings" ? "page" : undefined}
              className={cn(
                "flex size-8 items-center justify-center rounded-xl border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                pathname === "/settings"
                  ? "border-primary/50 bg-accent text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground",
              )}
            >
              <Settings2 className="size-4" />
            </Link>
            <ThemeToggle />
            <SignOutButton className="justify-center" />
          </div>
        </div>
      </header>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border/70 bg-background/95 backdrop-blur-xl lg:hidden"
      >
        <div className="grid grid-cols-4 gap-1 p-1.5">
          {mobileTabs.map((link) => {
            const active = pathname === link.href
            const Icon = link.icon

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl border px-1.5 py-2 text-xs font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  active
                    ? "border-primary/50 bg-accent text-primary hover:border-primary/50 hover:bg-accent hover:text-primary dark:border-border dark:bg-secondary dark:text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="size-5" />
                {link.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
