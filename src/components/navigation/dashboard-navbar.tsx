"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, LayoutDashboard, NotebookTabs, Settings2, TimerReset } from "lucide-react"

import { BrandMark } from "@/components/brand/brand-mark"
import { Button } from "@/components/ui/button"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { cn } from "@/lib/utils"

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/semesters", label: "Semesters", icon: NotebookTabs },
  { href: "/tasks", label: "Tasks", icon: BarChart3 },
  { href: "/pomodoro", label: "Timer", icon: TimerReset },
  { href: "/settings", label: "Settings", icon: Settings2 },
]

export function DashboardNavbar() {
  const pathname = usePathname()

  return (
    <>
      <aside className="hidden min-h-screen w-[300px] border-r border-border/70 bg-[linear-gradient(180deg,color-mix(in_oklch,var(--background)_94%,var(--primary)_6%),var(--background))] lg:sticky lg:top-0 lg:flex lg:flex-col">
        <div className="flex flex-1 flex-col gap-6 p-6">
          <Link href="/dashboard" className="rounded-[1.4rem] border border-border/60 bg-card/70 p-3 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.45)] backdrop-blur-xl">
            <BrandMark subtitle="Student productivity workspace" />
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">Live</span>
              <span>Emerald workspace</span>
            </div>
          </Link>

          <div className="rounded-[1.4rem] border border-border/60 bg-card/70 px-4 py-3 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.35)] backdrop-blur-xl">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
              Workspace
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Jump between your overview, semesters, tasks, and focus tools.
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
                    active && "border border-primary/20 bg-primary text-primary-foreground shadow-sm",
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

          <div className="space-y-3 border-t border-border pt-4">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </aside>

      <header className="border-b border-border/70 bg-background/90 px-4 py-4 lg:hidden backdrop-blur-xl">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Link href="/dashboard" className="rounded-2xl border border-border/60 bg-card/70 p-2 shadow-[0_16px_30px_-28px_rgba(15,23,42,0.35)] backdrop-blur-xl">
              <BrandMark showLabel={false} />
            </Link>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <SignOutButton />
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
                  className={cn("gap-2 rounded-full px-4", active && "border border-primary/20 shadow-sm")}
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
