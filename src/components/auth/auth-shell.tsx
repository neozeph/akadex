import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { ReactNode } from "react"

import { HeroBackground } from "@/components/landing/HeroBackground"

type AuthShellProps = {
  backHref: string
  backLabel: string
  children: ReactNode
}

/**
 * Shared shell for all four auth pages (login, register, forgot-password,
 * update-password) — one place owning the GIF/gradient background so
 * Landing → Register → Login reads as one continuous public experience,
 * rather than four pages each re-implementing the same backdrop markup.
 *
 * The card itself is deliberately near-opaque (bg-card/95, not a light
 * translucent glass effect) — the brief is explicit that the form must stay
 * easy to read against the animated/gradient background behind it.
 */
export function AuthShell({ backHref, backLabel, children }: AuthShellProps) {
  return (
    <main className="min-h-screen">
      <HeroBackground className="flex min-h-screen flex-col px-4 py-6 sm:px-6 lg:px-8">
        <Link
          href={backHref}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-2 text-sm text-white/90 backdrop-blur-sm transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <ArrowLeft className="size-4" />
          {backLabel}
        </Link>

        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-md rounded-[2rem] border border-border/70 bg-card/95 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
            {children}
          </div>
        </div>
      </HeroBackground>
    </main>
  )
}
