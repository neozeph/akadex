import { redirect } from "next/navigation"
import Link from "next/link"

import { PageHeader } from "@/components/ui/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GwaBySemesterChart } from "@/components/analytics/gwa-by-semester-chart"
import { GradeDistributionChart } from "@/components/analytics/grade-distribution-chart"
import { TaskCompletionChart } from "@/components/analytics/task-completion-chart"
import { FocusTimeChart } from "@/components/analytics/focus-time-chart"
import { AnalyticsRangePicker } from "@/components/analytics/analytics-range-picker"
import { SUBJECT_STATUS_BADGE_CLASSES } from "@/lib/grades"
import { formatFocusDuration, formatFocusMinutes } from "@/lib/pomodoro"
import { getAuthenticatedUser } from "@/lib/supabase/session"

import { getAnalyticsData } from "./data"
import { getActivityAnalyticsData, parseAnalyticsRange } from "./activity-data"

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect("/login")
  }

  const resolvedSearchParams = await searchParams
  const range = parseAnalyticsRange(resolvedSearchParams.range)

  // Academic analytics never depend on `range` — fetched independently and
  // in parallel with activity analytics, not sequentially.
  const [analytics, activity] = await Promise.all([
    getAnalyticsData(user.id),
    getActivityAnalyticsData(user.id, range),
  ])

  const hasSemesters = analytics.semesterCount > 0
  const hasGrades = analytics.gradedCount > 0
  const hasAnyTaskEver = activity.totalTaskCount > 0
  const rangeLabel = range === "7d" ? "7 days" : range === "30d" ? "30 days" : "all time"

  return (
    <main className="space-y-6">
      <PageHeader title="Analytics" description="Understand your academic and study patterns." />

      {!hasSemesters ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm font-medium text-foreground">No academic data yet.</p>
          <p className="text-sm text-muted-foreground">
            Add a semester and subjects to start seeing your academic trends.
          </p>
          <Button asChild>
            <Link href="/semesters">Go to Semesters</Link>
          </Button>
        </div>
      ) : (
        <>
          <section className="space-y-4 rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
            <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Academic Performance
            </h2>

            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <dd className="text-2xl font-semibold text-foreground">
                  {analytics.overallGwa === null ? "—" : analytics.overallGwa.toFixed(2)}
                </dd>
                <dt className="text-xs text-muted-foreground">Overall GWA</dt>
              </div>
              <div>
                <dd className="text-2xl font-semibold text-foreground">{analytics.semesterCount}</dd>
                <dt className="text-xs text-muted-foreground">
                  Semester{analytics.semesterCount === 1 ? "" : "s"}
                </dt>
              </div>
              <div>
                <dd className="text-2xl font-semibold text-foreground">{analytics.subjectCount}</dd>
                <dt className="text-xs text-muted-foreground">
                  Subject{analytics.subjectCount === 1 ? "" : "s"}
                </dt>
              </div>
              <div>
                <dd className="text-2xl font-semibold text-foreground">{analytics.totalUnits.toFixed(1)}</dd>
                <dt className="text-xs text-muted-foreground">Units</dt>
              </div>
            </dl>

            {!hasGrades ? <p className="text-sm text-muted-foreground">No grades recorded yet.</p> : null}
          </section>

          <section className="space-y-3 rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">GWA by Semester</h3>

            {hasGrades ? (
              <>
                <GwaBySemesterChart data={analytics.gwaBySemester} />
                <p className="text-xs text-muted-foreground">Lower GWA indicates stronger academic performance.</p>
              </>
            ) : (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No grades recorded yet. GWA trends will appear here once subjects have grades.
              </p>
            )}
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">Grade Distribution</h3>

              {hasGrades ? (
                <GradeDistributionChart data={analytics.gradeDistribution} />
              ) : (
                <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No grades recorded yet.
                </p>
              )}
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">Subject Status</h3>

              <dl className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center gap-2 rounded-lg border border-border p-3 text-center">
                  <dd className="text-xl font-semibold text-foreground">{analytics.passedCount}</dd>
                  <dt>
                    <Badge variant="outline" className={SUBJECT_STATUS_BADGE_CLASSES.success}>
                      PASSED
                    </Badge>
                  </dt>
                </div>
                <div className="flex flex-col items-center gap-2 rounded-lg border border-border p-3 text-center">
                  <dd className="text-xl font-semibold text-foreground">{analytics.failedCount}</dd>
                  <dt>
                    <Badge variant="outline" className={SUBJECT_STATUS_BADGE_CLASSES.danger}>
                      FAILED
                    </Badge>
                  </dt>
                </div>
                <div className="flex flex-col items-center gap-2 rounded-lg border border-border p-3 text-center">
                  <dd className="text-xl font-semibold text-foreground">{analytics.ungradedCount}</dd>
                  <dt>
                    <Badge variant="outline" className={SUBJECT_STATUS_BADGE_CLASSES.neutral}>
                      UNGRADED
                    </Badge>
                  </dt>
                </div>
              </dl>
            </div>
          </section>
        </>
      )}

      {/* Study Activity is deliberately outside the hasSemesters gate above —
          tasks and Pomodoro are independent of academic data and should
          still show even for an account with no semesters yet. */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Study Activity</h2>
          <AnalyticsRangePicker range={range} />
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground">Task Activity</h3>

          <dl className="grid grid-cols-3 gap-4">
            <div>
              <dd className="text-xl font-semibold text-foreground">{activity.completedCount}</dd>
              <dt className="text-xs text-muted-foreground">Completed ({rangeLabel})</dt>
            </div>
            <div>
              <dd className="text-xl font-semibold text-foreground">{activity.activeNow}</dd>
              <dt className="text-xs text-muted-foreground">Active now</dt>
            </div>
            <div>
              <dd className="text-xl font-semibold text-foreground">{activity.overdueNow}</dd>
              <dt className="text-xs text-muted-foreground">Overdue now</dt>
            </div>
          </dl>

          {activity.hasLegacyUndatedCompletions ? (
            <p className="text-xs text-muted-foreground">
              Some older completed tasks don&apos;t have completion dates and aren&apos;t included in time-based
              trends.
            </p>
          ) : null}

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Tasks Completed</p>
            {activity.completedCount > 0 ? (
              <TaskCompletionChart data={activity.taskTrend} />
            ) : (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {hasAnyTaskEver ? "No task completions in this period." : "No task activity yet."}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground">Focus Activity</h3>

          <dl className="grid grid-cols-3 gap-4">
            <div>
              <dd className="text-xl font-semibold text-foreground">{formatFocusDuration(activity.focusTimeSeconds)}</dd>
              <dt className="text-xs text-muted-foreground">Focus Time</dt>
            </div>
            <div>
              <dd className="text-xl font-semibold text-foreground">{activity.completedSessionCount}</dd>
              <dt className="text-xs text-muted-foreground">Sessions</dt>
            </div>
            <div>
              <dd className="text-xl font-semibold text-foreground">
                {activity.completedSessionCount > 0 ? formatFocusMinutes(activity.averageSessionSeconds) : "—"}
              </dd>
              <dt className="text-xs text-muted-foreground">Average</dt>
            </div>
          </dl>

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Focus Time</p>
            {activity.completedSessionCount > 0 ? (
              <FocusTimeChart data={activity.focusTrend} />
            ) : (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No completed focus sessions in this period.
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
