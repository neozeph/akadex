import { redirect } from "next/navigation"
import Link from "next/link"
import { CalendarDays } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { DashboardActions } from "@/components/dashboard/dashboard-actions"
import { getAuthenticatedUser, getSupabaseClaims } from "@/lib/supabase/session"
import { getTaskPriorityStyles } from "@/lib/tasks"
import { cn } from "@/lib/utils"
import { getDashboardData } from "./data"
import { createTask } from "../tasks/actions"
import { createSemester } from "../semesters/actions"

function getDisplayName(claims: Record<string, unknown> | undefined) {
  const metadata = (claims?.user_metadata ?? {}) as Record<string, unknown>
  const fullName = typeof metadata.full_name === "string" ? metadata.full_name : undefined
  const name = typeof metadata.name === "string" ? metadata.name : undefined
  const email = typeof claims?.email === "string" ? claims.email : undefined
  const candidate = fullName ?? name ?? email?.split("@")?.[0] ?? "Student"

  return candidate.split(" ")[0] || "Student"
}

export default async function DashboardPage() {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect("/login")
  }

  const { data } = await getSupabaseClaims()
  const claims = data?.claims as Record<string, unknown> | undefined
  const dashboard = await getDashboardData(user.id)
  const displayName = getDisplayName(claims)
  const currentYear = new Date().getFullYear()

  const statCards = [
    {
      label: "Overall GWA",
      value: dashboard.overallGpa === null ? "No grades yet" : dashboard.overallGpa.toFixed(2),
      hint: dashboard.overallGpa === null ? "Add graded subjects to compute this" : "Weighted by completed units",
    },
    {
      label: "Units completed",
      value: dashboard.totalUnitsCompleted.toFixed(1),
      hint: "Only graded subjects count for now",
    },
    {
      label: "Semesters",
      value: String(dashboard.semesterCount),
      hint: "All academic terms saved",
    },
    {
      label: "Pending tasks",
      value: String(dashboard.pendingTaskCount),
      hint: `${dashboard.completedTaskCount} completed`,
    },
    {
      label: "Focus today",
      value: `${dashboard.focusMinutesToday}m`,
      hint: `${dashboard.pomodoroSessionsToday} sessions logged`,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${displayName}`}
        description="Here’s your academic and productivity overview."
        action={<DashboardActions currentYear={currentYear} onCreateTask={createTask} onCreateSemester={createSemester} />}
      />

      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {statCards.map((card) => (
            <article key={card.label} className="rounded-2xl border border-border p-4">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="mt-3 text-2xl font-semibold">{card.value}</p>
              <p className="mt-3 text-sm text-muted-foreground">{card.hint}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/70 bg-card/80 p-0 shadow-sm">
          <CardHeader className="flex-row items-start justify-between gap-3 px-6 pt-6">
            <div>
              <CardTitle>Recent tasks</CardTitle>
              <CardDescription>What deserves your attention next.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="bg-background/50">
              <Link href="/tasks">Open tasks</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 px-6 pb-6">
            {dashboard.upcomingTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-background/60 p-6 text-sm text-muted-foreground">
                No active tasks yet. Add one when you are ready and it will show up here.
              </div>
            ) : (
              dashboard.upcomingTasks.map((task) => {
                const priorityStyle = getTaskPriorityStyles(task.priority)

                return (
                  <article
                    key={task.id}
                    className={cn(
                      "rounded-lg border bg-card p-2.5 shadow-sm transition-colors duration-200 hover:bg-accent/40",
                      priorityStyle.border,
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        aria-hidden="true"
                        className="mt-1 flex size-3.5 shrink-0 items-center justify-center rounded-full border border-border"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">{task.title}</p>
                          <span
                            className={cn(
                              "shrink-0 text-[0.68rem] font-semibold uppercase tracking-wide",
                              priorityStyle.label,
                            )}
                          >
                            {task.priority}
                          </span>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {task.subject
                            ? `${task.subject.subject_code} · ${task.subject.subject_name}`
                            : task.due_date
                              ? `Due ${task.due_date}`
                              : "No due date"}
                        </p>
                      </div>
                    </div>
                  </article>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" />
              Pomodoro summary
            </CardTitle>
            <CardDescription>Short focus sessions that keep the day moving.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/60 p-3">
              <span className="text-sm text-muted-foreground">Focus minutes</span>
              <span className="text-lg font-semibold">{dashboard.focusMinutesToday}m</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/60 p-3">
              <span className="text-sm text-muted-foreground">Sessions</span>
              <span className="text-lg font-semibold">{dashboard.pomodoroSessionsToday}</span>
            </div>
            <Button asChild variant="outline" className="w-full justify-start bg-background/60">
              <Link href="/pomodoro">Open timer</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
