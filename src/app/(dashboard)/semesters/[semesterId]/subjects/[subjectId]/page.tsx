import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

import { PageHeader } from "@/components/ui/page-header"
import { Badge } from "@/components/ui/badge"
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog"
import { TaskCard, type TaskRecord } from "@/components/tasks/task-card"
import { SubjectWorkspaceActions } from "@/components/academic/subject-workspace-actions"
import { formatGrade, getSubjectStatus, SUBJECT_STATUS_BADGE_CLASSES } from "@/lib/grades"
import { formatSemesterLabel } from "@/lib/semesters"
import { formatSubjectOptionLabel } from "@/lib/subjects"
import { compareTasksByUrgency, formatTaskDueDateLabel } from "@/lib/tasks"
import { toISODate } from "@/lib/dates"
import { getAuthenticatedUser } from "@/lib/supabase/session"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

import { deleteSubject, updateSubject } from "@/app/(dashboard)/semesters/[semesterId]/actions"
import { createTask, deleteTask, setTaskCompletion, updateTask } from "@/app/(dashboard)/tasks/actions"

async function getSubjectWorkspaceData(semesterId: string, subjectId: string) {
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

  // Four focused queries, run together — not one query per task/subject.
  // Ownership is validated after they resolve; every query already scopes
  // by user_id so a mismatched/foreign id can never leak another user's row.
  const [semesterResult, subjectResult, allSubjectsResult, tasksResult] = await Promise.all([
    supabase
      .from("semesters")
      .select("id, title, school_year, year_level, term, school_year_start")
      .eq("id", semesterId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("subjects")
      .select("id, subject_code, subject_name, units, grade, semester_id")
      .eq("id", subjectId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("subjects")
      .select("id, subject_code, subject_name, semester:semesters(year_level, term, school_year_start)")
      .eq("user_id", userId)
      .order("subject_code", { ascending: true }),
    supabase
      .from("tasks")
      .select("id, title, description, tags, due_date, priority, status, subject_id, series_id")
      .eq("user_id", userId)
      .eq("subject_id", subjectId)
      .neq("status", "done"),
  ])

  if (semesterResult.error || !semesterResult.data) {
    redirect("/semesters")
  }

  if (subjectResult.error || !subjectResult.data) {
    redirect(`/semesters/${semesterId}`)
  }

  const subject = subjectResult.data

  // Exists and belongs to this user, but not to the semester named in the
  // URL — bounce it the same way as "not found" instead of revealing that a
  // subject with this id exists under a different semester.
  if (subject.semester_id !== semesterId) {
    redirect(`/semesters/${semesterId}`)
  }

  if (allSubjectsResult.error) {
    throw new Error(allSubjectsResult.error.message)
  }

  if (tasksResult.error) {
    throw new Error(tasksResult.error.message)
  }

  // Without generated Supabase types, an embedded relationship is typed as
  // an array regardless of FK cardinality — normalize the actual
  // many-to-one row PostgREST returns at runtime into a single object.
  const firstOrNull = <T,>(value: T | T[] | null | undefined): T | null =>
    Array.isArray(value) ? (value[0] ?? null) : (value ?? null)

  const allSubjects = (allSubjectsResult.data ?? []).map((option) => ({
    id: option.id,
    label: formatSubjectOptionLabel({
      id: option.id,
      subject_code: option.subject_code,
      subject_name: option.subject_name,
      semester: firstOrNull(option.semester),
    }),
  }))

  return {
    semester: semesterResult.data,
    subject,
    allSubjects,
    tasks: tasksResult.data ?? [],
  }
}

export default async function SubjectWorkspacePage({
  params,
}: {
  params: Promise<{ semesterId: string; subjectId: string }>
}) {
  const { semesterId, subjectId } = await params
  const { semester, subject, allSubjects, tasks } = await getSubjectWorkspaceData(semesterId, subjectId)

  const status = getSubjectStatus(subject.grade)
  const semesterLabel = formatSemesterLabel(semester)
  const todayISO = toISODate(new Date())

  // Overdue, then today, then upcoming by date, then no due date last.
  const activeTasks: TaskRecord[] = [...tasks]
    .sort((a, b) => compareTasksByUrgency(a, b, todayISO))
    .map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      tags: task.tags,
      due_date: task.due_date,
      priority: task.priority,
      status: task.status,
      subject_id: task.subject_id,
      series_id: task.series_id,
      // Every task here already belongs to this subject — repeating
      // "CS101 · Programming Fundamentals" on each card would be redundant.
      subject: null,
    }))

  return (
    <main className="space-y-6">
      <Link
        href={`/semesters/${semester.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {semesterLabel}
      </Link>

      <PageHeader
        title={subject.subject_code}
        description={subject.subject_name}
        action={
          <SubjectWorkspaceActions
            subject={subject}
            semesterId={semester.id}
            onUpdate={updateSubject}
            onDelete={deleteSubject}
          />
        }
      />

      <section className="flex flex-wrap gap-x-8 gap-y-3 rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Grade</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {subject.grade === null ? "—" : formatGrade(subject.grade)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Units</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{Number(subject.units)}</p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Status</p>
          <Badge variant="outline" className={cn("mt-1.5", SUBJECT_STATUS_BADGE_CLASSES[status.tone])}>
            {status.label.toUpperCase()}
          </Badge>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Active Tasks</h2>
            <Link
              href={`/tasks?subject=${subject.id}&status=done`}
              className="text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
            >
              View completed tasks
            </Link>
          </div>
          <CreateTaskDialog onCreate={createTask} subjects={allSubjects} initialSubjectId={subject.id} />
        </div>

        {activeTasks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No active tasks for this subject.
              <br />
              Add a task to start planning your work.
            </p>
            <CreateTaskDialog onCreate={createTask} subjects={allSubjects} initialSubjectId={subject.id} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {activeTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                subjects={allSubjects}
                onUpdateTask={updateTask}
                onDeleteTask={deleteTask}
                onSetTaskCompletion={setTaskCompletion}
                dueDateLabel={formatTaskDueDateLabel(task.due_date, todayISO)}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
