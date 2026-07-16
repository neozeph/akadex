import Link from "next/link"
import { Compass, Home } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_32%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.16),transparent_24%),linear-gradient(135deg,#f8faf6_0%,#f5fef9_48%,#ffffff_100%)] px-4 py-10 text-foreground dark:bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.15),transparent_32%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.12),transparent_20%),linear-gradient(135deg,#0f172a_0%,#111827_50%,#0b1220_100%)]">
      <div className="w-full max-w-2xl rounded-[2rem] border border-emerald-200/70 bg-card/85 p-8 text-center shadow-soft backdrop-blur-xl dark:border-emerald-500/20 dark:bg-slate-900/70 sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
          <Compass className="size-7" />
        </div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.32em] text-emerald-600 dark:text-emerald-300">
          Lost in the woods
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Looks like you wandered off the trail.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-muted-foreground">
          The page you were looking for is not here. Return to base camp and continue your academic adventure with a clear path forward.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="gap-2">
            <Link href="/">
              <Home className="size-4" />
              Return to Base Camp
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/contact">
              Contact us
            </Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
