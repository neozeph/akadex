"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

const MIN_PASSWORD_LENGTH = 6

export function UpdatePasswordForm() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)

    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.")
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })

    setLoading(false)

    if (error) {
      setErrorMessage("We couldn't update your password. Make sure it meets the minimum requirements and try again.")
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <div className="space-y-4">
        <p
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-sm text-muted-foreground"
        >
          Your password has been updated.
        </p>
        <Button
          className="w-full"
          size="lg"
          onClick={() => {
            router.push("/dashboard")
            router.refresh()
          }}
        >
          Continue to dashboard
        </Button>
      </div>
    )
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="password">
          New password
        </label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="confirm-password">
          Confirm new password
        </label>
        <Input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
          required
        />
      </div>

      {errorMessage ? (
        <p role="alert" className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <Button className="w-full" size="lg" type="submit" disabled={loading}>
        {loading ? "Please wait..." : "Update password"}
      </Button>
    </form>
  )
}
