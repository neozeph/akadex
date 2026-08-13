import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { Save, Trash2 } from "lucide-react"

import { PageHeader } from "@/components/ui/page-header"
import { DeleteConfirmDialog } from "@/components/academic/delete-confirm-dialog"
import { CreateSubjectDialog } from "@/components/academic/create-subject-dialog"
import { calculateGwa, formatGrade, getSubjectStatus, GRADE_OPTIONS } from "@/lib/grades"
import { formatSemesterLabel, formatSemesterSchoolYear } from "@/lib/semesters"
import { getAuthenticatedUser } from "@/lib/supabase/session"
import { createSupabaseServerClient } from "@/lib/supabase/server"

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
    throw new Error(subjectsError.message)
  }

  return { semester, subjects: subjects ?? [] }
}

export default async function SemesterDetailPage({
  params,
}: {
  params: Promise<{ semesterId: string }>
}) {
  const { semesterId } = await params
  const { semester, subjects } = await getSemesterDetail(semesterId)
  const semesterUnits = subjects
    .filter((subject) => subject.grade !== null)
    .reduce((sum, subject) => sum + Number(subject.units), 0)
  const semesterGwa = calculateGwa(subjects)
  const passedSubjects = subjects.filter(
    (subject) => getSubjectStatus(subject.grade).tone === "success",
  ).length
  const failedSubjects = subjects.filter(
    (subject) => getSubjectStatus(subject.grade).tone === "danger",
  ).length
  const semesterLabel = formatSemesterLabel(semester)
  const semesterSchoolYear = formatSemesterSchoolYear(semester)

  return (
    <main className="space-y-6">
      <PageHeader
        title={semesterLabel}
        description={semesterSchoolYear}
        action={<CreateSubjectDialog semesterId={semester.id} onCreate={createSubject} />}
      />

      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-border p-4">
            <p className="text-sm text-muted-foreground">Semester GWA</p>
            <p className="mt-3 text-3xl font-semibold">
              {semesterGwa === null ? "No grades yet" : semesterGwa.toFixed(2)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">Computed from graded subjects</p>
          </article>
          <article className="rounded-2xl border border-border p-4">
            <p className="text-sm text-muted-foreground">Graded units</p>
            <p className="mt-3 text-3xl font-semibold">{semesterUnits.toFixed(1)}</p>
            <p className="mt-2 text-sm text-muted-foreground">Used in semester GWA</p>
          </article>
          <article className="rounded-2xl border border-border p-4">
            <p className="text-sm text-muted-foreground">Passed subjects</p>
            <p className="mt-3 text-3xl font-semibold">{passedSubjects}</p>
            <p className="mt-2 text-sm text-muted-foreground">Grades 1.00 to 3.00</p>
          </article>
          <article className="rounded-2xl border border-border p-4">
            <p className="text-sm text-muted-foreground">Failed subjects</p>
            <p className="mt-3 text-3xl font-semibold">{failedSubjects}</p>
            <p className="mt-2 text-sm text-muted-foreground">Grades at 5.00</p>
          </article>
        </div>
      </section>

      <section className="space-y-4 rounded-[2rem] border border-border bg-card p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold">Subjects</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {subjects.length} subject{subjects.length === 1 ? "" : "s"} found
          </p>
        </div>

        <div className="grid gap-4">
          {subjects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-sm text-muted-foreground">
              No subjects yet. Add your first subject to start calculating your GWA.
            </div>
          ) : (
              subjects.map((subject) => {
                async function handleDeleteSubject() {
                  "use server"

                  const formData = new FormData()
                  formData.set("semester_id", semester.id)
                  formData.set("subject_id", subject.id)
                  await deleteSubject(formData)
                }

                return (
                <article key={subject.id} className="rounded-2xl border border-border p-4">
                  <form
                    action={updateSubject}
                    className="grid gap-3 lg:grid-cols-[minmax(10rem,12rem)_minmax(0,1.7fr)_minmax(5rem,6rem)_minmax(8rem,9rem)_auto]"
                  >
                    <input type="hidden" name="semester_id" value={semester.id} />
                    <input type="hidden" name="subject_id" value={subject.id} />

                    <div>
                      <label className="mb-2 block text-xs font-medium text-muted-foreground uppercase">
                        Code
                      </label>
                      <input
                        name="subject_code"
                        defaultValue={subject.subject_code}
                        className="h-11 w-full rounded-xl border border-border bg-background px-4 font-mono text-sm uppercase outline-none transition focus:border-foreground"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium text-muted-foreground uppercase">
                        Name
                      </label>
                      <input
                        name="subject_name"
                        defaultValue={subject.subject_name}
                        className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-foreground"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium text-muted-foreground uppercase">
                        Units
                      </label>
                      <input
                        name="units"
                        type="number"
                        step="0.5"
                        min="0.5"
                        max="10"
                        defaultValue={subject.units}
                        className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-foreground"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium text-muted-foreground uppercase">
                        Grade
                      </label>
                      <select
                        name="grade"
                        defaultValue={subject.grade === null ? "" : subject.grade.toFixed(2)}
                        className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-foreground"
                      >
                        <option value="">No grade</option>
                        {GRADE_OPTIONS.map((grade) => (
                          <option key={grade} value={grade.toFixed(2)}>
                            {grade.toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-end gap-2">
                      <button
                        type="submit"
                        className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                      >
                        <Save className="size-4" />
                        Save
                      </button>
                    </div>
                  </form>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          getSubjectStatus(subject.grade).tone === "success"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : getSubjectStatus(subject.grade).tone === "danger"
                              ? "bg-rose-500/10 text-rose-600"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {getSubjectStatus(subject.grade).label}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Grade {formatGrade(subject.grade)}
                      </span>
                    </div>

                    <DeleteConfirmDialog
                      trigger={
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10"
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </button>
                      }
                      title={`Delete ${subject.subject_code}?`}
                      description="This subject will be permanently deleted. This action cannot be undone."
                      confirmLabel="Delete subject"
                      pendingLabel="Deleting..."
                      errorMessage="Something went wrong deleting this subject. Please try again."
                      onConfirm={handleDeleteSubject}
                    />
                  </div>
                </article>
                )
              })
            )}
        </div>
      </section>
    </main>
  )
}
