import type { ReactNode } from "react"

import { Footer } from "@/components/landing/Footer"
import { Navbar } from "@/components/landing/Navbar"

type PageShellProps = {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}

export function PageShell({ eyebrow, title, description, actions, children }: PageShellProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_32%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.12),transparent_24%),linear-gradient(135deg,#f8faf6_0%,#f5fef9_48%,#ffffff_100%)] text-foreground dark:bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.15),transparent_32%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.1),transparent_20%),linear-gradient(135deg,#0f172a_0%,#111827_50%,#0b1220_100%)]">
      <Navbar />
      <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-[2rem] border border-emerald-200/70 bg-card/80 p-8 shadow-soft backdrop-blur-xl dark:border-emerald-500/20 dark:bg-slate-900/70 sm:p-10 lg:p-14">
            {eyebrow ? (
              <p className="text-sm font-semibold uppercase tracking-[0.32em] text-emerald-600 dark:text-emerald-300">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
                {description}
              </p>
            ) : null}
            {actions ? <div className="mt-8 flex flex-wrap gap-3">{actions}</div> : null}
          </div>

          <div className="mt-8">{children}</div>
        </div>
      </section>
      <Footer />
    </main>
  )
}
