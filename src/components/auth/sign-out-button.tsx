"use client"

import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

type SignOutButtonProps = {
  className?: string
  size?: "default" | "sm" | "lg" | "icon"
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive" | "link"
}

export function SignOutButton({ className, size = "sm", variant = "outline" }: SignOutButtonProps) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <Button variant={variant} size={size} onClick={handleSignOut} className={className}>
      Sign out
    </Button>
  )
}
