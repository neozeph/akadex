import { redirect } from "next/navigation"

import { getAuthenticatedUser } from "@/lib/supabase/session"

import { logPomodoroSession } from "./actions"
import { getPomodoroPageData } from "./data"
import { PomodoroTimer } from "@/components/pomodoro/pomodoro-timer"
import { PageHeader } from "@/components/ui/page-header"
import { Clock3, Flame, Hourglass, Zap } from "lucide-react"

function formatSessionTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60)
  return `${minutes} min`
}

export default async function PomodoroPage() {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect("/login")
  }

  const userId = user.id
  const { recentSessions, completedTodayCount, totalFocusMinutes } = await getPomodoroPageData(userId)

  return (
    <main className="space-y-6">
      <PageHeader title="Pomodoro" description="Stay focused with structured study sessions." />

      <PomodoroTimer onCompleteSession={logPomodoroSession} />

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        <article className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-border p-3">
              <Flame className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sessions today</p>
              <p className="mt-1 text-2xl font-semibold">{completedTodayCount}</p>
            </div>
          </div>
        </article>

        <article className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-border p-3">
              <Clock3 className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Focus minutes today</p>
              <p className="mt-1 text-2xl font-semibold">{totalFocusMinutes}</p>
            </div>
          </div>
        </article>

        <article className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-border p-3">
              <Hourglass className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Default cycle</p>
              <p className="mt-1 text-2xl font-semibold">25 / 5</p>
            </div>
          </div>
        </article>

        <article className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-border p-3">
              <Zap className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Auto save</p>
              <p className="mt-1 text-2xl font-semibold">On</p>
            </div>
          </div>
        </article>
      </section>

      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Recent sessions</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your recent focus sessions.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {recentSessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-sm text-muted-foreground">
              No sessions yet. Start a focus round above and it will appear here.
            </div>
          ) : (
            recentSessions.map((session) => (
              <article key={session.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border p-4">
                <div>
                  <p className="font-semibold">
                    {session.completed ? "Focus session completed" : "Incomplete session"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatSessionTime(session.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-border px-3 py-1 text-xs font-medium uppercase text-muted-foreground">
                    {formatDuration(session.duration)}
                  </span>
                  <span className="rounded-full border border-border px-3 py-1 text-xs font-medium uppercase text-muted-foreground">
                    {session.completed ? "Completed" : "Saved"}
                  </span>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  )
}
