import Link from "next/link"
import { ArrowRight, Leaf, Sparkles, Star } from "lucide-react"

import { Button } from "@/components/ui/button"

export function BeginAdventure() {
  return (
    <section id="about" className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-[2rem] border border-emerald-200/70 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_38%),linear-gradient(135deg,#ecfdf5_0%,#f8fafc_52%,#ecfeff_100%)] p-8 shadow-soft dark:border-emerald-500/20 dark:bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.14),transparent_30%),linear-gradient(135deg,#052e16_0%,#0f172a_64%,#111827_100%)] sm:p-10 lg:p-14">
          <div className="absolute left-6 top-6 text-emerald-500/50 dark:text-emerald-300/30">
            <Leaf className="size-7" />
          </div>
          <div className="absolute right-6 top-6 text-amber-400/50 dark:text-amber-300/30">
            <Star className="size-6" />
          </div>
          <div className="absolute bottom-6 right-10 text-sky-400/40 dark:text-sky-300/25">
            <Sparkles className="size-6" />
          </div>

          <div className="relative max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-emerald-600 dark:text-emerald-300">
              Begin your adventure
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Ready to begin your academic adventure?
            </h2>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              Every great journey starts with a single step. Build stronger study habits, stay organized, and take control of your college life with Akadeks.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/register">
                <Button size="lg" className="gap-2 px-6">
                  Start Adventure
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="px-6">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
