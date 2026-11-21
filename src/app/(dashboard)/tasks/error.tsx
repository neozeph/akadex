"use client"

import { useEffect, useRef, useTransition } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function TasksError({ unstable_retry }: { unstable_retry: () => void | Promise<unknown> }) {
  const heading = useRef<HTMLHeadingElement>(null)
  const [pending, startTransition] = useTransition()
  useEffect(() => { heading.current?.focus() }, [])
  return (
    <section aria-labelledby="tasks-error-heading" aria-busy={pending} className="space-y-4 rounded-xl border border-border bg-card p-6">
      <h1 id="tasks-error-heading" ref={heading} tabIndex={-1} className="text-2xl font-semibold outline-none">Tasks unavailable</h1>
      <p role="alert" className="text-sm text-muted-foreground">Unable to load your tasks right now. Please try again.</p>
      <div className="flex flex-wrap gap-3">
        <Button disabled={pending} onClick={() => startTransition(async () => { await unstable_retry() })}>{pending ? "Retrying..." : "Try again"}</Button>
        <Button asChild variant="outline"><Link href="/tasks">Clear filters</Link></Button>
      </div>
    </section>
  )
}
