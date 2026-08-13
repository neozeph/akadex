"use client"

import Link from "next/link"
import { CalendarPlus, ListPlus, Play } from "lucide-react"

import { CreateSemesterDialog } from "@/components/academic/create-semester-dialog"
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog"
import { ThemeToggle } from "@/components/theme/theme-toggle"

type DashboardActionsProps = {
  currentYear: number
  onCreateTask: (formData: FormData) => Promise<void>
  onCreateSemester: (formData: FormData) => Promise<void>
}

const quickActionButtonClass =
  "flex size-9 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors duration-200 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"

export function DashboardActions({ currentYear, onCreateTask, onCreateSemester }: DashboardActionsProps) {
  return (
    <div className="flex items-center gap-1.5">
      <CreateTaskDialog
        onCreate={onCreateTask}
        trigger={
          <button type="button" title="Add task" aria-label="Add task" className={quickActionButtonClass}>
            <ListPlus className="size-4" />
          </button>
        }
      />
      <CreateSemesterDialog
        onCreate={onCreateSemester}
        currentYear={currentYear}
        trigger={
          <button type="button" title="Add semester" aria-label="Add semester" className={quickActionButtonClass}>
            <CalendarPlus className="size-4" />
          </button>
        }
      />
      <Link href="/pomodoro" title="Start Pomodoro" aria-label="Start Pomodoro" className={quickActionButtonClass}>
        <Play className="size-4" />
      </Link>
      <ThemeToggle className={quickActionButtonClass} />
    </div>
  )
}
