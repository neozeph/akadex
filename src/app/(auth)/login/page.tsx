import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, BookOpen, ShieldCheck } from "lucide-react"

import { AuthForm } from "@/components/auth/auth-form"
import { BrandMark } from "@/components/brand/brand-mark"
import { Badge } from "@/components/ui/badge"
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_32%),linear-gradient(135deg,#f8faf6_0%,#f5fef9_100%)] px-4 py-6 text-foreground dark:bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.16),transparent_28%),linear-gradient(135deg,#0f172a_0%,#111827_100%)] sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:gap-8">
        <Link href="/" className="inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-card/80 px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="size-4" />
          Back home
        </Link>

        <div className="flex flex-col gap-6 lg:grid lg:min-h-[calc(100vh-7rem)] lg:grid-cols-[1fr_0.95fr] lg:items-center lg:gap-8">
          <section className="order-2 lg:order-1">
            <div className="rounded-[2rem] border border-border/70 bg-card/70 p-6 shadow-soft sm:p-8">
              <Badge variant="secondary" className="gap-2 px-3 py-1.5">
                <BookOpen className="size-3.5" />
                Continue your semester journey
              </Badge>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                Sign in to continue your study flow.
              </h1>
              <p className="mt-4 max-w-lg text-base leading-8 text-muted-foreground sm:text-lg">
                Use one account for grades, tasks, and focused study sessions without losing momentum.
              </p>
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-border/70 bg-background/70 p-4 shadow-sm">
                <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <p className="font-medium">Secure and focused</p>
                  <p className="text-sm text-muted-foreground">Your academic workspace stays organized and private.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="order-1 lg:order-2">
            <div className="mx-auto w-full max-w-md rounded-[2rem] border border-border/70 bg-card/95 p-6 shadow-soft backdrop-blur-xl sm:p-8">
              <BrandMark subtitle="Welcome back" className="mb-6" />
              <div className="mb-6">
                <h2 className="text-2xl font-semibold">Sign in</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  New here?{' '}
                  <Link className="font-medium text-foreground underline" href="/register">
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
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
