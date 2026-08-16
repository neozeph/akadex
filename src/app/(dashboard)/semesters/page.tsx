import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { PencilLine, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { DeleteConfirmDialog } from "@/components/academic/delete-confirm-dialog"
import { EditSemesterDialog } from "@/components/academic/edit-semester-dialog"
import { CreateSemesterDialog } from "@/components/academic/create-semester-dialog"
import { SemesterCard } from "@/components/academic/semester-card"
import { getAuthenticatedUser } from "@/lib/supabase/session"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { formatSemesterLabel } from "@/lib/semesters"
import { throwPublicError } from "@/lib/server-errors"

import { createSemester, deleteSemester, updateSemester } from "./actions"

async function getSemesters() {
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

  const { data, error } = await supabase
    .from("semesters")
    .select("id, title, school_year, year_level, term, school_year_start, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    throwPublicError("semesters.loadList", error, "Unable to load your semesters right now.")
  }

  return data ?? []
}

export default async function SemestersPage() {
  const semesters = await getSemesters()
  const currentYear = new Date().getFullYear()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Semesters"
        description="Organize subjects and track your academic performance."
        action={<CreateSemesterDialog onCreate={createSemester} currentYear={currentYear} />}
      />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            {semesters.length} semester{semesters.length === 1 ? "" : "s"}
          </h2>
        </div>

        {semesters.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No semesters yet. Use &ldquo;Add Semester&rdquo; above to create your first one.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {semesters.map((semester) => {
              async function handleDeleteSemester() {
                "use server"

                const formData = new FormData()
                formData.set("semester_id", semester.id)
                await deleteSemester(formData)
              }

              async function handleUpdateSemester(values: {
                yearLevel: number
                term: string
                schoolYearStart: number
              }) {
                "use server"

                const formData = new FormData()
                formData.set("semester_id", semester.id)
                formData.set("year_level", String(values.yearLevel))
                formData.set("term", values.term)
                formData.set("school_year_start", String(values.schoolYearStart))
                await updateSemester(formData)
              }

              const semesterLabel = formatSemesterLabel(semester)

              return (
                <SemesterCard
                  key={semester.id}
                  semester={semester}
                  editAction={
                    <EditSemesterDialog
                      trigger={
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label={`Edit ${semesterLabel}`}
                          className="bg-card"
                        >
                          <PencilLine className="size-3.5" />
                        </Button>
                      }
                      initialYearLevel={semester.year_level}
                      initialTerm={semester.term}
                      initialSchoolYearStart={semester.school_year_start}
                      currentYear={currentYear}
                      onSave={handleUpdateSemester}
                    />
                  }
                  deleteAction={
                    <DeleteConfirmDialog
                      trigger={
                        <button
                          type="button"
                          aria-label={`Delete ${semesterLabel}`}
                          className="inline-flex size-7 items-center justify-center rounded-lg border border-border bg-card text-destructive transition hover:bg-destructive/10"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      }
                      title={`Delete ${semesterLabel}?`}
                      description="This will permanently delete this semester and all subjects inside it. This action cannot be undone."
                      confirmLabel="Delete semester"
                      pendingLabel="Deleting..."
                      errorMessage="Something went wrong deleting this semester. Please try again."
                      onConfirm={handleDeleteSemester}
                    />
                  }
                />
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
