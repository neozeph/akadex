import { redirect } from "next/navigation"
import Link from "next/link"
import { BookOpenCheck, CalendarDays, Flame, Sparkles, Target } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getSupabaseClaims } from "@/lib/supabase/session"
import { getDashboardData } from "./data"

function getDisplayName(claims: Record<string, unknown> | undefined) {
  const metadata = (claims?.user_metadata ?? {}) as Record<string, unknown>
  const fullName = typeof metadata.full_name === "string" ? metadata.full_name : undefined
  const name = typeof metadata.name === "string" ? metadata.name : undefined
  const email = typeof claims?.email === "string" ? claims.email : undefined
  const candidate = fullName ?? name ?? email?.split("@")?.[0] ?? "Student"

  return candidate.split(" ")[0] || "Student"
}

export default async function DashboardPage() {
  const { data } = await getSupabaseClaims()

  if (!data?.claims?.sub) {
    redirect("/login")
  }

  const claims = data.claims as Record<string, unknown>
  const userId = data.claims.sub
  const dashboard = await getDashboardData(userId)
  const displayName = getDisplayName(claims)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"
  const glassCardClass =
    "flex h-full flex-col justify-between rounded-[1.35rem] border border-border/70 bg-card/85 p-4 shadow-sm backdrop-blur-xl"

  const statCards = [
    {
      label: "Overall GPA",
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
    <main className="space-y-8">
      <section className="relative isolate overflow-hidden rounded-[2rem] border border-border/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(240,253,244,0.92))] p-6 shadow-soft backdrop-blur-xl sm:p-8 dark:bg-[linear-gradient(135deg,rgba(6,78,59,0.94),rgba(6,95,70,0.82))]">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.2),transparent_30%,transparent_70%,rgba(255,255,255,0.12))] dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.06),transparent_30%,transparent_70%,rgba(255,255,255,0.04))]" />
        <div className="absolute -left-8 top-8 h-32 w-32 rounded-full bg-white/30 blur-3xl dark:bg-emerald-300/10" />
        <div className="absolute -right-10 bottom-0 h-44 w-44 rounded-full bg-primary/20 blur-3xl dark:bg-emerald-200/10" />

        <div className="relative flex flex-col gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-full border border-primary/20 bg-background/80 text-sm font-semibold text-primary shadow-sm">
                  {displayName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{greeting},</p>
                  <h1 className="text-2xl font-semibold sm:text-3xl">{displayName} 👋</h1>
                </div>
              </div>
              <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
                Here is a calm overview of your academic progress and the next things to tackle.
              </p>
            </div>
            <div className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-sm font-medium text-muted-foreground backdrop-blur">
              Base camp ready
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Button asChild variant="default" className="justify-start">
              <Link href="/semesters">Add subject</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start bg-background/70 backdrop-blur">
              <Link href="/tasks">Create task</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start bg-background/70 backdrop-blur">
              <Link href="/pomodoro">Start pomodoro</Link>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {statCards.map((card) => (
              <article key={card.label} className={glassCardClass}>
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="mt-3 text-2xl font-semibold sm:text-3xl">{card.value}</p>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{card.hint}</p>
              </article>
            ))}
          </div>
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
          <CardContent className="space-y-3 px-6 pb-6">
            {dashboard.upcomingTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-background/60 p-6 text-sm text-muted-foreground">
                No active tasks yet. Add one when you are ready and it will show up here.
              </div>
            ) : (
              dashboard.upcomingTasks.map((task) => (
                <article key={task.id} className="rounded-2xl border border-border/60 bg-background/50 p-4">
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
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/70 bg-card/80 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="size-4 text-primary" />
                Academic progress
              </CardTitle>
              <CardDescription>Keep your weekly rhythm visible and rewarding.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Weekly focus goal</span>
                  <span className="text-muted-foreground">68%</span>
                </div>
                <Progress value={68} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-background/60 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Flame className="size-4 text-amber-500" />
                    Streak
                  </div>
                  <p className="mt-2 text-2xl font-semibold">5 days</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/60 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <BookOpenCheck className="size-4 text-primary" />
                    Goals reached
                  </div>
                  <p className="mt-2 text-2xl font-semibold">3</p>
                </div>
              </div>
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
        </div>
      </section>
    </main>
  )
}
