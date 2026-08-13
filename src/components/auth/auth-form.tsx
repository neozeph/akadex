"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

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
        setMessage(
          `Your account was created. Check ${email} for a confirmation email and click the link inside it to activate your account before signing in.`,
        )
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
