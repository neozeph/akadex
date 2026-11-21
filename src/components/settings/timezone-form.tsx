"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function TimezoneForm({ timeZone, onSave }: { timeZone: string; onSave: (form: FormData) => Promise<{ error: string | null }> }) {
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, setPending] = useState(false)
  return (
    <form className="space-y-4 rounded-[2rem] border border-border bg-card p-6 shadow-sm" aria-busy={pending} onSubmit={async (event) => {
      event.preventDefault()
      const form = new FormData(event.currentTarget)
      setError(null)
      setSaved(false)
      setPending(true)
      try {
          const result = await onSave(form)
          setError(result.error)
          setSaved(!result.error)
      } catch { setError("Unable to save your timezone. Please try again.") }
      finally { setPending(false) }
    }}>
      <h2 className="text-xl font-semibold">Calendar timezone</h2>
      <p id="timezone-help" className="text-sm text-muted-foreground">Today, deadlines, and study reports use this timezone. The initial default is Asia/Manila. Date-only deadlines stay the same.</p>
      <label htmlFor="timezone" className="block text-sm font-medium">Timezone</label>
      <input id="timezone" name="timezone" defaultValue={timeZone} required maxLength={100} disabled={pending} aria-describedby="timezone-help" aria-invalid={Boolean(error)} placeholder="Asia/Manila" className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-foreground focus:ring-3 focus:ring-primary/20" />
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">{pending ? "Saving timezone..." : saved ? "Timezone saved." : "Use an IANA name, for example America/New_York."}</p>
      <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save timezone"}</Button>
    </form>
  )
}
