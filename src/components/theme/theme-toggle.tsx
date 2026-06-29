"use client"

import { MoonStar, SunMedium } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme/theme-provider"

export function ThemeToggle() {
  const { resolvedTheme, mounted, setTheme } = useTheme()

  const isDark = resolvedTheme === "dark"
  const isReady = mounted

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle dark mode"
      className="gap-2"
    >
      {isReady ? (
        isDark ? <SunMedium className="size-4" /> : <MoonStar className="size-4" />
      ) : (
        <MoonStar className="size-4" />
      )}
      <span className="hidden sm:inline">{isReady ? (isDark ? "Light mode" : "Dark mode") : "Theme"}</span>
    </Button>
  )
}
