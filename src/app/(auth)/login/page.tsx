import Link from "next/link"
import { redirect } from "next/navigation"

import { AuthForm } from "@/components/auth/auth-form"
import { AuthShell } from "@/components/auth/auth-shell"
import { BrandMark } from "@/components/brand/brand-mark"
import { getAuthenticatedUser } from "@/lib/supabase/session"

const CALLBACK_ERROR_MESSAGES: Record<string, string> = {
  missing_code: "That confirmation link is missing required information. Please request a new one.",
  confirmation_failed: "That confirmation link is invalid or has expired. Please try registering again or request a new confirmation email.",
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const user = await getAuthenticatedUser()

  if (user) {
    redirect("/dashboard")
  }

  const { error } = await searchParams
  const errorMessage = error ? CALLBACK_ERROR_MESSAGES[error] ?? "Something went wrong. Please try again." : null

  return (
    <AuthShell backHref="/" backLabel="Back home">
      <BrandMark subtitle="Welcome back." className="mb-6" />

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Continue where you left off.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          New to Akadex?{" "}
          <Link className="font-medium text-foreground underline underline-offset-2" href="/register">
            Create an account
          </Link>
        </p>
      </div>

      {errorMessage ? (
        <p className="mb-6 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <AuthForm mode="login" />
    </AuthShell>
  )
}
