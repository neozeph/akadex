"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type">

export function getPasswordInputType(visible: boolean) {
  return visible ? "text" : "password"
}

export function getPasswordToggleLabel(visible: boolean) {
  return visible ? "Hide password" : "Show password"
}

export function togglePasswordVisibility(visible: boolean) {
  return !visible
}

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  const Icon = visible ? EyeOff : Eye

  return (
    <div className="relative">
      <Input
        {...props}
        type={getPasswordInputType(visible)}
        className={cn("pr-12", className)}
      />
      <button
        type="button"
        aria-label={getPasswordToggleLabel(visible)}
        aria-pressed={visible}
        className="absolute right-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        onClick={() => setVisible(togglePasswordVisibility)}
      >
        <Icon className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
