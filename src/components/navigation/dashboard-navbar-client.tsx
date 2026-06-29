"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, LayoutDashboard, NotebookTabs, Settings2, TimerReset } from "lucide-react"

import { BrandMark } from "@/components/brand/brand-mark"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/semesters", label: "Semesters", icon: NotebookTabs },
  { href: "/tasks", label: "Tasks", icon: BarChart3 },
  { href: "/pomodoro", label: "Timer", icon: TimerReset },
  { href: "/settings", label: "Settings", icon: Settings2 },
]

type DashboardNavbarClientProps = {
  displayName: string
  initials: string
}

export function DashboardNavbarClient({ displayName, initials }: DashboardNavbarClientProps) {
  const pathname = usePathname()

  return (
    <>
      <aside className="hidden w-70 shrink-0 border-r border-border/70 bg-[linear-gradient(180deg,color-mix(in_oklch,var(--background)_94%,var(--primary)_6%),var(--background))] lg:flex lg:h-screen lg:flex-col">
        <div className="flex flex-1 flex-col gap-6 p-6">
          <Link href="/dashboard" className="rounded-[1.4rem] border border-border/60 bg-card/70 p-4 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.45)] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {initials}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Welcome
                </p>
                <p className="text-base font-semibold text-foreground">{displayName}</p>
              </div>
            </div>
            <div className="mt-4">
              <BrandMark subtitle="Your study base camp" />
            </div>
          </Link>

          <div className="rounded-[1.4rem] border border-border/60 bg-card/70 px-4 py-3 shadow-[0_16px_30px_-28px_rgba(15,23,42,0.35)] backdrop-blur-xl">
            <p className="text-sm font-medium text-foreground">Stay grounded, keep moving.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your courses, tasks, and focus time stay in one calm place.
            </p>
          </div>

          <nav className="flex flex-1 flex-col gap-2">
            {links.map((link) => {
              const active = pathname === link.href
              const Icon = link.icon

              return (
                <Button
                  key={link.href}
                  asChild
                  variant={active ? "default" : "ghost"}
                  className={cn(
                    "h-11 w-full justify-start gap-3 rounded-2xl px-4 transition-all",
                    active && "border border-primary/20 bg-primary/10 text-primary shadow-sm",
                  )}
                >
                  <Link href={link.href} aria-current={active ? "page" : undefined}>
                    <Icon className="size-4" />
                    {link.label}
                  </Link>
                </Button>
              )
            })}
          </nav>

          <div className="grid gap-2 border-t border-border/60 pt-4">
            <ThemeToggle />
            <SignOutButton className="w-full justify-center" />
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 px-4 py-4 backdrop-blur-xl lg:hidden">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Link href="/dashboard" className="rounded-2xl border border-border/60 bg-card/70 p-2 shadow-[0_16px_30px_-28px_rgba(15,23,42,0.35)] backdrop-blur-xl">
              <BrandMark showLabel={false} />
            </Link>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <SignOutButton className="justify-center" />
            </div>
          </div>

          <nav className="flex items-center gap-2 overflow-x-auto pb-1">
            {links.map((link) => {
              const active = pathname === link.href
              const Icon = link.icon

              return (
                <Button
                  key={link.href}
                  asChild
                  variant={active ? "default" : "ghost"}
                  size="sm"
                  className="gap-2 rounded-full px-4"
                >
                  <Link href={link.href} aria-current={active ? "page" : undefined}>
                    <Icon className="size-4" />
                    {link.label}
                  </Link>
                </Button>
              )
            })}
          </nav>
        </div>
      </header>
    </>
  )
}
