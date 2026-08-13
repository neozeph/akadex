"use client"

import { Moon, Sun } from "lucide-react"

import { useTheme } from "@/components/theme/theme-provider"
import { cn } from "@/lib/utils"

/**
 * Icon represents the destination, not the current state: Moon while
 * light (click to go dark), Sun while dark (click to go light).
 *
 * Hydration safety: `mounted` starts false identically on the server and
 * the first client render (see ThemeProvider), so the Moon icon and
 * "Toggle theme" label are what both sides agree on before hydration.
 * Only after ThemeProvider's mount effect resolves does the icon/label
 * switch to the real destination — a normal post-hydration state update,
 * not a server/client mismatch. That effect now defers its setState calls
 * via `queueMicrotask` rather than `requestAnimationFrame`, since rAF is
 * suspended entirely for a non-visible document (a backgrounded/minimized
 * tab, or one restored inactive) and could leave `mounted` stuck
 * indefinitely; see the comment in theme-provider.tsx. The button stays a
 * fixed `size-9` icon-only square throughout, so the post-mount update
 * never shifts layout.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, mounted, setTheme } = useTheme()
  const isDark = mounted && resolvedTheme === "dark"
  const label = mounted ? (isDark ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={label}
      aria-label={label}
      className={cn(
        "flex size-9 items-center justify-center rounded-xl border border-transparent text-muted-foreground transition-colors duration-200 hover:border-border hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}
