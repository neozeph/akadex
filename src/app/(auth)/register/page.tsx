import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, Sparkles, Trophy } from "lucide-react"

import { AuthForm } from "@/components/auth/auth-form"
import { BrandMark } from "@/components/brand/brand-mark"
import { Badge } from "@/components/ui/badge"
import { getAuthenticatedUser } from "@/lib/supabase/session"

export default async function RegisterPage() {
  const user = await getAuthenticatedUser()

  if (user) {
    redirect("/dashboard")
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.14),transparent_32%),linear-gradient(135deg,#fefcf4_0%,#fffdf8_100%)] px-4 py-6 text-foreground dark:bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.12),transparent_28%),linear-gradient(135deg,#111827_0%,#0f172a_100%)] sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:gap-8">
        <Link href="/" className="inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-card/80 px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="size-4" />
          Back home
        </Link>

        <div className="flex flex-col gap-6 lg:grid lg:min-h-[calc(100vh-7rem)] lg:grid-cols-[1fr_0.95fr] lg:items-center lg:gap-8">
          <section className="order-2 lg:order-1">
            <div className="rounded-[2rem] border border-border/70 bg-card/70 p-6 shadow-soft sm:p-8">
              <Badge variant="accent" className="gap-2 px-3 py-1.5">
                <Sparkles className="size-3.5" />
                Join Akadex
              </Badge>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                Create your academic workspace in a minute.
              </h1>
              <p className="mt-4 max-w-lg text-base leading-8 text-muted-foreground sm:text-lg">
                Start tracking subjects, tasks, and study sessions without juggling multiple apps.
              </p>
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-border/70 bg-background/70 p-4 shadow-sm">
                <div className="rounded-2xl bg-amber-500/10 p-2 text-amber-600 dark:text-amber-300">
                  <Trophy className="size-5" />
                </div>
                <div>
                  <p className="font-medium">Earn momentum</p>
                  <p className="text-sm text-muted-foreground">Each completed subject feels like a badge on your journey.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="order-1 lg:order-2">
            <div className="mx-auto w-full max-w-md rounded-[2rem] border border-border/70 bg-card/95 p-6 shadow-soft backdrop-blur-xl sm:p-8">
              <BrandMark subtitle="Start your journey" className="mb-6" />
              <div className="mb-6">
                <h2 className="text-2xl font-semibold">Create account</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Already have one?{' '}
                  <Link className="font-medium text-foreground underline" href="/login">
                    Sign in
                  </Link>
                </p>
              </div>
              <AuthForm mode="register" />
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
