import Link from "next/link"
import { redirect } from "next/navigation"

import { AuthForm } from "@/components/auth/auth-form"
import { AuthShell } from "@/components/auth/auth-shell"
import { BrandMark } from "@/components/brand/brand-mark"
import { getAuthenticatedUser } from "@/lib/supabase/session"

export default async function RegisterPage() {
  const user = await getAuthenticatedUser()

  if (user) {
    redirect("/dashboard")
  }

  return (
    <AuthShell backHref="/" backLabel="Back home">
      <BrandMark subtitle="Create your Akadex." className="mb-6" />

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">One place for your semesters, tasks, focus sessions, and progress.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link className="font-medium text-foreground underline underline-offset-2" href="/login">
            Sign in
          </Link>
        </p>
      </div>

      <AuthForm mode="register" />
    </AuthShell>
  )
}
