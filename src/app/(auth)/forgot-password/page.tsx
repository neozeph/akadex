import Link from "next/link"
import { redirect } from "next/navigation"

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { AuthShell } from "@/components/auth/auth-shell"
import { BrandMark } from "@/components/brand/brand-mark"
import { getAuthenticatedUser } from "@/lib/supabase/session"

export default async function ForgotPasswordPage() {
  const user = await getAuthenticatedUser()

  if (user) {
    redirect("/dashboard")
  }

  return (
    <AuthShell backHref="/login" backLabel="Back to sign in">
      <BrandMark subtitle="Account recovery" className="mb-6" />

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Forgot your password?</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      <ForgotPasswordForm />

      <p className="mt-6 text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link className="font-medium text-foreground underline underline-offset-2" href="/login">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  )
}
