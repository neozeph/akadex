import Link from "next/link"

import { UpdatePasswordForm } from "@/components/auth/update-password-form"
import { AuthShell } from "@/components/auth/auth-shell"
import { BrandMark } from "@/components/brand/brand-mark"
import { Button } from "@/components/ui/button"
import { getAuthenticatedUser } from "@/lib/supabase/session"

export default async function UpdatePasswordPage() {
  const user = await getAuthenticatedUser()

  return (
    <AuthShell backHref="/login" backLabel="Back to sign in">
      <BrandMark subtitle="Account recovery" className="mb-6" />

      {user ? (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-foreground">Choose a new password</h1>
            <p className="mt-2 text-sm text-muted-foreground">Enter and confirm a new password for your account.</p>
          </div>
          <UpdatePasswordForm />
        </>
      ) : (
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">This link is invalid or has expired</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Password recovery links only work once and expire after a short time. Request a new one to continue.
            </p>
          </div>
          <Button asChild className="w-full" size="lg">
            <Link href="/forgot-password">Request a new link</Link>
          </Button>
        </div>
      )}
    </AuthShell>
  )
}
