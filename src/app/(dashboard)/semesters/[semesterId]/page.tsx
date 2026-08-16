import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { PageHeader } from "@/components/ui/page-header"
import { Progress } from "@/components/ui/progress"
import { CreateSubjectDialog } from "@/components/academic/create-subject-dialog"
import { SubjectCard } from "@/components/academic/subject-card"
import { calculateGwa } from "@/lib/grades"
import { formatSemesterLabel, formatSemesterSchoolYear } from "@/lib/semesters"
import { getAuthenticatedUser } from "@/lib/supabase/session"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import { throwPublicError } from "@/lib/server-errors"

import { createSubject, deleteSubject, updateSubject } from "./actions"

async function getSemesterDetail(semesterId: string) {
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient({
    getAll() {
      return cookieStore.getAll()
    },
  })

  const user = await getAuthenticatedUser()

  if (!user) {
    redirect("/login")
  }

  const userId = user.id

  const { data: semester, error: semesterError } = await supabase
    .from("semesters")
    .select("id, title, school_year, year_level, term, school_year_start, created_at")
    .eq("id", semesterId)
    .eq("user_id", userId)
    .maybeSingle()

  if (semesterError || !semester) {
    redirect("/semesters")
  }

  const { data: subjects, error: subjectsError } = await supabase
    .from("subjects")
    .select("id, subject_code, subject_name, units, grade, created_at")
    .eq("semester_id", semesterId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (subjectsError) {
    throwPublicError("semesters.loadSubjects", subjectsError, "Unable to load this semester right now.")
  }

  const subjectRows = subjects ?? []
  const subjectIds = subjectRows.map((subject) => subject.id)

  // Single query for every subject's active task count instead of one
  // query per subject (N+1) — aggregated client-side into a Map below.
  const activeTaskCountBySubjectId = new Map<string, number>()

  if (subjectIds.length > 0) {
    const { data: activeTasks, error: activeTasksError } = await supabase
      .from("tasks")
      .select("id, subject_id")
      .eq("user_id", userId)
      .in("subject_id", subjectIds)
      .neq("status", "done")

    if (activeTasksError) {
      throwPublicError("semesters.loadActiveTasks", activeTasksError, "Unable to load this semester right now.")
    }

    for (const task of activeTasks ?? []) {
      if (task.subject_id) {
        activeTaskCountBySubjectId.set(
          task.subject_id,
          (activeTaskCountBySubjectId.get(task.subject_id) ?? 0) + 1,
        )
      }
    }
  }

  return { semester, subjects: subjectRows, activeTaskCountBySubjectId }
}

export default async function SemesterDetailPage({
  params,
}: {
  params: Promise<{ semesterId: string }>
}) {
  const { semesterId } = await params
  const { semester, subjects, activeTaskCountBySubjectId } = await getSemesterDetail(semesterId)

  const subjectCount = subjects.length
  const gradedSubjects = subjects.filter((subject) => subject.grade !== null)
  const gradedCount = gradedSubjects.length
  // Total Units = every enrolled subject's units, not just graded ones —
  // a different number from what calculateGwa() weights internally (graded
  // units only). Keep these two meanings distinct rather than conflating them.
  const totalUnits = subjects.reduce((sum, subject) => sum + Number(subject.units), 0)
  const semesterGwa = calculateGwa(subjects)
  const semesterLabel = formatSemesterLabel(semester)
  const semesterSchoolYear = formatSemesterSchoolYear(semester)

  // Derived from the same single active-task query Sprint 5.1 already runs
  // (see getSemesterDetail) — no additional query for the semester total.
  const totalActiveTaskCount = Array.from(activeTaskCountBySubjectId.values()).reduce(
    (sum, count) => sum + count,
    0,
  )

  const isFullyGraded = subjectCount > 0 && gradedCount === subjectCount
  const gradeCompletionPercent = subjectCount > 0 ? Math.round((gradedCount / subjectCount) * 100) : 0
  const gradeCompletionLabel =
    subjectCount === 0
      ? "No subjects yet"
      : isFullyGraded
        ? "All subjects graded"
        : `${gradedCount} of ${subjectCount} subject${subjectCount === 1 ? "" : "s"} graded`

  return (
    <div className="space-y-6">
      <PageHeader
        title={semesterLabel}
        description={semesterSchoolYear}
        action={<CreateSubjectDialog semesterId={semester.id} onCreate={createSubject} />}
      />

      <section className="space-y-4 rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Semester Overview</h2>

        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dd className="text-2xl font-semibold text-foreground">
              {semesterGwa === null ? "—" : semesterGwa.toFixed(2)}
            </dd>
            <dt className="text-xs text-muted-foreground">GWA</dt>
          </div>
          <div>
            <dd className="text-2xl font-semibold text-foreground">{subjectCount}</dd>
            <dt className="text-xs text-muted-foreground">Subject{subjectCount === 1 ? "" : "s"}</dt>
          </div>
          <div>
            <dd className="text-2xl font-semibold text-foreground">{totalUnits.toFixed(1)}</dd>
            <dt className="text-xs text-muted-foreground">Units</dt>
          </div>
          <div>
            <dd className="text-2xl font-semibold text-foreground">{totalActiveTaskCount}</dd>
            <dt className="text-xs text-muted-foreground">Active Task{totalActiveTaskCount === 1 ? "" : "s"}</dt>
          </div>
        </dl>

        <div className="space-y-1.5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Grade completion</p>
          <p className={cn("text-sm font-medium", isFullyGraded ? "text-highlight" : "text-foreground")}>
            {gradeCompletionLabel}
          </p>
          <Progress value={gradeCompletionPercent} aria-label="Grade completion" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Subjects · {subjects.length}
        </h2>

        {subjects.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No subjects yet. Add your first subject to start tracking grades and academic tasks.
            </p>
            <CreateSubjectDialog semesterId={semester.id} onCreate={createSubject} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {subjects.map((subject) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                semesterId={semester.id}
                activeTaskCount={activeTaskCountBySubjectId.get(subject.id) ?? 0}
                onUpdate={updateSubject}
                onDelete={deleteSubject}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
