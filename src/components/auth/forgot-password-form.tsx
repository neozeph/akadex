"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getAuthCallbackUrl } from "@/lib/auth-redirect"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

export function ForgotPasswordForm() {
  const supabase = createSupabaseBrowserClient()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle")

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getAuthCallbackUrl(window.location.origin),
    })

    setStatus(error ? "error" : "sent")
    setLoading(false)
  }

  if (status === "sent") {
    return (
      <p
        role="status"
        aria-live="polite"
        className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-sm text-muted-foreground"
      >
        Check your email. We&apos;ve sent password reset instructions to {email} if an account exists for that address.
      </p>
    )
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="email">
          Email
        </label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
      </div>

      {status === "error" ? (
        <p role="alert" className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Something went wrong. Please try again.
        </p>
      ) : null}

      <Button className="w-full" size="lg" type="submit" disabled={loading}>
        {loading ? "Please wait..." : "Send reset link"}
      </Button>
    </form>
  )
}
