"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

type AuthFormProps = {
  mode: "login" | "register"
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  // Set only when signUp() succeeds without an immediate session (email
  // confirmation required) — a distinct state from `message` so it can get
  // its own "check your email" panel below instead of an inline paragraph.
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage(null)

    if (mode === "register") {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setMessage(error.message)
      } else if (signUpData.session) {
        router.push("/dashboard")
        router.refresh()
      } else {
        setConfirmationEmail(email)
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setMessage(error.message)
      } else {
        router.push("/dashboard")
        router.refresh()
      }
    }

    setLoading(false)
  }

  if (confirmationEmail) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Mail className="size-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Check your email.</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            We sent a confirmation link to:
            <br />
            <span className="font-medium text-foreground">{confirmationEmail}</span>
          </p>
        </div>
        <Button asChild className="w-full" size="lg">
          <a href="https://mail.google.com/mail/u/0/#inbox" target="_blank" rel="noreferrer">
            Open Gmail
          </a>
        </Button>
        <p className="text-xs text-muted-foreground">
          Click the link in that email to activate your account, then{" "}
          <Link className="font-medium text-foreground underline underline-offset-2" href="/login">
            sign in
          </Link>
          .
        </p>
      </div>
    )
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {mode === "register" ? (
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="full-name">
            Full name
          </label>
          <Input
            id="full-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Juan Dela Cruz"
            autoComplete="name"
          />
        </div>
      ) : null}

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
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-foreground" htmlFor="password">
            Password
          </label>
          {mode === "login" ? (
            <Link className="text-sm font-medium text-foreground underline" href="/forgot-password">
              Forgot password?
            </Link>
          ) : null}
        </div>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
      </div>

      {message ? (
        <p className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}

      <Button className="w-full" size="lg" type="submit" disabled={loading}>
        {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
      </Button>
    </form>
  )
}
