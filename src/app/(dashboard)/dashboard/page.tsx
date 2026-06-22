import { redirect } from "next/navigation"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { getSupabaseClaims } from "@/lib/supabase/session"
import { getDashboardData } from "./data"

export default async function DashboardPage() {
  const { data } = await getSupabaseClaims()

  if (!data?.claims?.sub) {
    redirect("/login")
  }

  const userId = data.claims.sub
  const dashboard = await getDashboardData(userId)

  const statCards = [
    {
      label: "Overall GPA",
      value: dashboard.overallGpa === null ? "No grades yet" : dashboard.overallGpa.toFixed(2),
      hint: dashboard.overallGpa === null ? "Add graded subjects to compute this" : "Weighted by completed units",
    },
    {
      label: "Units Completed",
      value: dashboard.totalUnitsCompleted.toFixed(1),
      hint: "Only graded subjects count for now",
    },
    {
      label: "Semesters",
      value: String(dashboard.semesterCount),
      hint: "All academic terms saved",
    },
    {
      label: "Pending Tasks",
      value: String(dashboard.pendingTaskCount),
      hint: `${dashboard.completedTaskCount} completed`,
    },
    {
      label: "Pomodoro Sessions Today",
      value: String(dashboard.pomodoroSessionsToday),
      hint: `${dashboard.focusMinutesToday} focus minutes`,
    },
  ]

  return (
    <main className="space-y-6">
      <section className="rounded-[2rem] border border-border bg-card p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold tracking-[0.25em] text-muted-foreground uppercase">
              Dashboard
            </p>
            <h1 className="mt-4 text-3xl font-semibold">Your academic command center</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Here is your current academic snapshot pulled from Supabase. We will
              use this as the home base for the rest of the app.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/semesters">Manage semesters</Link>
            </Button>
            <SignOutButton />
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {statCards.map((card) => (
            <article key={card.label} className="rounded-2xl border border-border p-4">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="mt-3 text-3xl font-semibold">{card.value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{card.hint}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Upcoming tasks</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The next deadlines you should care about.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/tasks">Open tasks</Link>
            </Button>
          </div>

          <div className="mt-5 grid gap-3">
            {dashboard.upcomingTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                No active tasks yet. Add one when you are ready.
              </div>
            ) : (
              dashboard.upcomingTasks.map((task) => (
                <article key={task.id} className="rounded-2xl border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <h3 className="font-semibold">{task.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {task.due_date ? `Due ${task.due_date}` : "No due date"}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {task.tags.length > 0 ? (
                          task.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground"
                            >
                              #{tag}
                            </span>
                          ))
                        ) : (
                          <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                            No tags
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="rounded-full border border-border px-3 py-1 text-xs font-medium uppercase text-muted-foreground">
                      {task.priority}
                    </span>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Quick actions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Shortcuts to the parts of the MVP you will use most.
          </p>

          <div className="mt-5 grid gap-3">
            <Button asChild variant="outline" className="justify-start">
              <Link href="/semesters">Add or edit semesters</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/tasks">Plan tasks</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/pomodoro">Start focus timer</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/settings">Open settings</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
