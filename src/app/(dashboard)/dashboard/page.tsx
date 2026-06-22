import { redirect } from "next/navigation"
import Link from "next/link"

import { BrandMark } from "@/components/brand/brand-mark"
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
  const glassCardClass =
    "rounded-2xl border border-border/60 bg-card/70 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5"

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
      <section className="relative isolate overflow-hidden rounded-[2.25rem] border border-border/60 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.24),transparent_34%),radial-gradient(circle_at_top_right,rgba(6,95,70,0.16),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.94),rgba(236,253,245,0.86))] p-8 shadow-[0_30px_90px_-60px_rgba(15,23,42,0.6)] backdrop-blur-xl dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.2),transparent_34%),radial-gradient(circle_at_top_right,rgba(6,95,70,0.28),transparent_30%),linear-gradient(135deg,rgba(6,78,59,0.9),rgba(6,95,70,0.72))]">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.2),transparent_30%,transparent_70%,rgba(255,255,255,0.12))] dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.06),transparent_30%,transparent_70%,rgba(255,255,255,0.04))]" />
        <div className="absolute -left-12 top-8 h-40 w-40 rounded-full bg-white/30 blur-3xl dark:bg-emerald-300/10" />
        <div className="absolute -right-10 bottom-0 h-52 w-52 rounded-full bg-primary/20 blur-3xl dark:bg-emerald-200/10" />

        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl space-y-5">
            <BrandMark subtitle="Your academic command center" />
            <div className="space-y-3">
              <p className="text-sm font-semibold tracking-[0.25em] text-muted-foreground uppercase">
                Dashboard
              </p>
              <h1 className="text-3xl font-semibold sm:text-4xl">Stay on top of your college life.</h1>
              <p className="max-w-2xl text-muted-foreground">
                Your grades, semesters, tasks, and focus sessions live together in one calm,
                emerald workspace.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                Supabase synced
              </span>
              <span className="rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                Emerald theme
              </span>
              <span className="rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                Focus-friendly layout
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="bg-background/70 backdrop-blur">
              <Link href="/semesters">Manage semesters</Link>
            </Button>
            <SignOutButton />
          </div>
        </div>

        <div className="relative mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {statCards.map((card) => (
            <article key={card.label} className={glassCardClass + " p-4"}>
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="mt-3 text-3xl font-semibold">{card.value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{card.hint}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className={glassCardClass + " p-6"}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Upcoming tasks</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The next deadlines and study items worth your attention.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm" className="bg-background/50 backdrop-blur">
              <Link href="/tasks">Open tasks</Link>
            </Button>
          </div>

          <div className="mt-5 grid gap-3">
            {dashboard.upcomingTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-background/40 p-6 text-sm text-muted-foreground backdrop-blur dark:bg-white/5">
                No active tasks yet. Add one when you are ready and it will show up here.
              </div>
            ) : (
              dashboard.upcomingTasks.map((task) => (
                <article key={task.id} className="rounded-2xl border border-border/60 bg-background/50 p-4 backdrop-blur dark:border-white/10 dark:bg-white/5">
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

        <div className={glassCardClass + " p-6"}>
          <h2 className="text-xl font-semibold">Quick actions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Shortcuts to the parts of the MVP you will use most often.
          </p>

          <div className="mt-5 grid gap-3">
            <Button asChild variant="outline" className="justify-start bg-background/60 backdrop-blur">
              <Link href="/semesters">Add or edit semesters</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start bg-background/60 backdrop-blur">
              <Link href="/tasks">Plan tasks</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start bg-background/60 backdrop-blur">
              <Link href="/pomodoro">Start focus timer</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start bg-background/60 backdrop-blur">
              <Link href="/settings">Open settings</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
