import * as React from "react"

import { cn } from "@/lib/utils"

type PageHeaderProps = {
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

/**
 * Shared compact header used across the dashboard's top-level pages
 * (Dashboard, Tasks, Semesters, Semester detail, Pomodoro, Settings) so
 * heading size, description placement, and primary-action alignment stay
 * consistent instead of each page hand-rolling its own hero section.
 */
export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6",
        className,
      )}
    >
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description ? <p className="mt-1 text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  )
}
