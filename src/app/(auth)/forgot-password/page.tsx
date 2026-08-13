import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, KeyRound } from "lucide-react"

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { BrandMark } from "@/components/brand/brand-mark"
import { Badge } from "@/components/ui/badge"
import { getAuthenticatedUser } from "@/lib/supabase/session"

export default async function ForgotPasswordPage() {
  const user = await getAuthenticatedUser()

  if (user) {
    redirect("/dashboard")
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_32%),linear-gradient(135deg,#f8faf6_0%,#f5fef9_100%)] px-4 py-6 text-foreground dark:bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.16),transparent_28%),linear-gradient(135deg,#0f172a_0%,#111827_100%)] sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:gap-8">
        <Link href="/login" className="inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-card/80 px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="size-4" />
          Back to sign in
        </Link>

        <div className="mx-auto w-full max-w-md">
          <div className="rounded-[2rem] border border-border/70 bg-card/95 p-6 shadow-soft backdrop-blur-xl sm:p-8">
            <BrandMark subtitle="Account recovery" className="mb-6" />
            <Badge variant="secondary" className="mb-4 gap-2 px-3 py-1.5">
              <KeyRound className="size-3.5" />
              Reset your password
            </Badge>
            <div className="mb-6">
              <h1 className="text-2xl font-semibold">Forgot your password?</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>
            </div>
            <ForgotPasswordForm />
            <p className="mt-6 text-sm text-muted-foreground">
              Remembered it?{' '}
              <Link className="font-medium text-foreground underline" href="/login">
                Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
