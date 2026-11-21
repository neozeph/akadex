"use client"

import { useEffect, useRef, useTransition } from "react"
import { Button } from "@/components/ui/button"

export default function DashboardError({ unstable_retry }: { unstable_retry: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => { heading.current?.focus() }, [])

  return (
    <section aria-labelledby="dashboard-error-heading" aria-busy={pending} className="space-y-4 rounded-xl border border-border bg-card p-6">
      <h1 id="dashboard-error-heading" ref={heading} tabIndex={-1} className="text-2xl font-semibold text-foreground outline-none">
        Dashboard unavailable
      </h1>
      <p role="alert" className="text-sm text-muted-foreground">Unable to load your dashboard right now. Please try again.</p>
      <Button disabled={pending} onClick={() => startTransition(() => unstable_retry())}>
        {pending ? "Retrying..." : "Try again"}
      </Button>
    </section>
  )
}
