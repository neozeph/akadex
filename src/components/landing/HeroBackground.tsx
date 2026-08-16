import { existsSync } from "node:fs"
import path from "node:path"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type HeroBackgroundProps = {
  className?: string
  children?: ReactNode
}

function assetExists(publicPath: string) {
  try {
    return existsSync(path.join(process.cwd(), "public", publicPath.replace(/^\//, "")))
  } catch {
    return false
  }
}

/**
 * Shared hero.webp/hero-dark.webp-or-gradient background used by both the
 * landing Hero and the auth pages (login/register/forgot/update-password),
 * so the public experience reads as one continuous world.
 *
 * Theme switching is CSS-only (Tailwind `dark:` → the app's existing `.dark`
 * class on <html>, toggled outside React's render by ThemeProvider) rather
 * than client-state branching, so the server-rendered and first-client-render
 * markup are always identical — no hydration mismatch risk, no
 * suppressHydrationWarning needed. Both assets are static (single-frame)
 * WebPs, so no reduced-motion suppression is needed for the artwork itself.
 *
 * Existence of each asset is checked once, server-side, at render time
 * (same technique as the screenshot gallery's placeholder handling). If
 * hero-dark.webp is ever missing, the `dark:` override is simply omitted so
 * dark mode gracefully continues showing hero.webp instead of a broken
 * background — once the file is supplied, a rebuild picks it up with no
 * code change.
 */
export function HeroBackground({ className, children }: HeroBackgroundProps) {
  const hasLight = assetExists("/brand/hero.webp")
  const hasDark = assetExists("/brand/hero-dark.webp")

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Base gradient: always present, doubles as the layout-safe backdrop
          while the hero image loads (or if neither asset exists). Built
          from actual Akadex tokens (sage primary, terracotta accent), not a
          generic placeholder palette. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(160deg,var(--primary)_0%,#16241b_48%,var(--terracotta)_142%)] dark:bg-[linear-gradient(160deg,#0a140d_0%,var(--background)_55%,#2a1509_142%)]"
      />

      {hasLight ? (
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-0 bg-cover bg-center bg-[url('/brand/hero.webp')]",
            hasDark && "dark:bg-[url('/brand/hero-dark.webp')]",
          )}
        />
      ) : null}

      {/* Readability overlay — tuned per theme rather than shared, since
          hero-dark.webp is already a low-key night scene: crushing it with
          the same overlay used for the bright daytime hero.webp would flatten
          the moon/window-glow detail that gives it its atmosphere. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,18,12,0.32)_0%,rgba(10,18,12,0.62)_75%,rgba(10,18,12,0.78)_100%)] dark:bg-[linear-gradient(180deg,rgba(16,26,36,0.24)_0%,rgba(16,26,36,0.52)_75%,rgba(16,26,36,0.7)_100%)]"
      />

      <div className="relative">{children}</div>
    </div>
  )
}
