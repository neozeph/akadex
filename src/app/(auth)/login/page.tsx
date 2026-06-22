import Link from "next/link"
import { redirect } from "next/navigation"

import { AuthForm } from "@/components/auth/auth-form"
import { getSupabaseClaims } from "@/lib/supabase/session"

export default async function LoginPage() {
  const { data } = await getSupabaseClaims()

  if (data?.claims?.sub) {
    redirect("/dashboard")
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f1f5f9,transparent_35%),linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-6 py-12 text-slate-950">
      <div className="mx-auto grid min-h-[calc(100vh-6rem)] max-w-6xl items-center gap-8 lg:grid-cols-2">
        <section className="order-2 lg:order-1">
          <div className="max-w-xl">
            <p className="text-sm font-semibold tracking-[0.25em] text-slate-500 uppercase">
              Welcome back
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">
              Sign in to continue your semester workflow.
            </h1>
            <p className="mt-4 max-w-lg text-lg leading-8 text-slate-600">
              Use one account for grades, tasks, and focused study sessions.
            </p>
          </div>
        </section>

        <section className="order-1 lg:order-2">
          <div className="mx-auto w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.4)]">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold">Sign in</h2>
              <p className="mt-2 text-sm text-slate-600">
                New here?{" "}
                <Link className="font-medium text-slate-950 underline" href="/register">
                  Create an account
                </Link>
              </p>
            </div>
            <AuthForm mode="login" />
          </div>
        </section>
      </div>
    </main>
  )
}
