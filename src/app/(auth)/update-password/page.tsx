import Link from "next/link"
import { ArrowLeft, KeyRound } from "lucide-react"

import { UpdatePasswordForm } from "@/components/auth/update-password-form"
import { BrandMark } from "@/components/brand/brand-mark"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getAuthenticatedUser } from "@/lib/supabase/session"

export default async function UpdatePasswordPage() {
  const user = await getAuthenticatedUser()

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
              Set a new password
            </Badge>

            {user ? (
              <>
                <div className="mb-6">
                  <h1 className="text-2xl font-semibold">Choose a new password</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Enter and confirm a new password for your account.
                  </p>
                </div>
                <UpdatePasswordForm />
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl font-semibold">This link is invalid or has expired</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Password recovery links only work once and expire after a short time. Request a new one to continue.
                  </p>
                </div>
                <Button asChild className="w-full" size="lg">
                  <Link href="/forgot-password">Request a new link</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
