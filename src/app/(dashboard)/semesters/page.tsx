import Link from "next/link"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { PencilLine, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { getSupabaseClaims } from "@/lib/supabase/session"
import { createSupabaseServerClient } from "@/lib/supabase/server"

import { createSemester, deleteSemester } from "./actions"

async function getSemesters() {
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient({
    getAll() {
      return cookieStore.getAll()
    },
  })

  const { data: claimsResult } = await getSupabaseClaims()

  if (!claimsResult?.claims?.sub) {
    redirect("/login")
  }

  const userId = claimsResult.claims.sub

  const { data, error } = await supabase
    .from("semesters")
    .select("id, title, school_year, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export default async function SemestersPage() {
  const semesters = await getSemesters()

  return (
    <main className="space-y-6">
      <section className="rounded-[2rem] border border-border bg-card p-8 shadow-sm">
        <p className="text-sm font-semibold tracking-[0.25em] text-muted-foreground uppercase">
          Semesters
        </p>
        <h1 className="mt-4 text-3xl font-semibold">Manage academic terms</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Add each semester here before tracking subjects and GPA.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <form
          action={createSemester}
          className="space-y-4 rounded-[2rem] border border-border bg-card p-6 shadow-sm"
        >
          <div>
            <h2 className="text-xl font-semibold">New semester</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Keep titles simple and consistent.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="title">
              Semester title
            </label>
            <input
              id="title"
              name="title"
              placeholder="1st Year 1st Semester"
              className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-foreground"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="school_year">
              School year
            </label>
            <input
              id="school_year"
              name="school_year"
              placeholder="2025-2026"
              className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-foreground"
              required
            />
          </div>

          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            Save semester
          </button>
        </form>

        <section className="space-y-4 rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Your semesters</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {semesters.length} semester{semesters.length === 1 ? "" : "s"} found
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            {semesters.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-8 text-sm text-muted-foreground">
                No semesters yet. Add your first one on the left.
              </div>
            ) : (
              semesters.map((semester) => (
                <article
                  key={semester.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-border p-4"
                >
                  <div>
                    <h3 className="font-semibold">{semester.title}</h3>
                    <p className="text-sm text-muted-foreground">{semester.school_year}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/semesters/${semester.id}`}>
                        <PencilLine className="size-4" />
                        Edit
                      </Link>
                    </Button>

                    <form action={deleteSemester}>
                      <input type="hidden" name="semester_id" value={semester.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10"
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </button>
                    </form>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  )
}
