import Link from "next/link"
import { ArrowRight, CheckCircle2, Clock3, LayoutGrid, BarChart3 } from "lucide-react"

import { BrandMark } from "@/components/brand/brand-mark"
import { Button } from "@/components/ui/button"

const highlights = [
  {
    title: "Track academics in one place",
    description:
      "Semesters, subjects, tasks, and study sessions live together instead of scattered across apps.",
    icon: LayoutGrid,
  },
  {
    title: "See progress at a glance",
    description:
      "Quick stats keep GPA, workloads, and focus habits visible without overwhelming the screen.",
    icon: BarChart3,
  },
  {
    title: "Stay in study mode",
    description:
      "Pomodoro support gives the MVP a practical productivity loop from day one.",
    icon: Clock3,
  },
]

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#e8f0ff,transparent_38%),radial-gradient(circle_at_top_right,#f3efe7,transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_55%,#ffffff_100%)] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6 lg:px-10">
        <header className="flex items-center justify-between rounded-full border border-emerald-100/80 bg-white/70 px-5 py-3 shadow-[0_10px_40px_-24px_rgba(15,23,42,0.35)] backdrop-blur">
          <BrandMark showLabel subtitle="Student productivity workspace" />
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">
                Get started
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.2fr_0.8fr] lg:py-20">
          <div className="max-w-2xl">
            <span className="inline-flex rounded-full border border-slate-200 bg-white/80 px-4 py-1 text-sm font-medium text-slate-600 shadow-sm">
              Built for college life, not generic task management
            </span>
            <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-6xl">
              Organize your academic life in one calm workspace.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Acadex helps students track grades, manage semesters, organize
              tasks, and stay productive with a focused Pomodoro workflow.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/register">
                <Button size="lg" className="px-6">
                  Start free
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="px-6">
                  I already have an account
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600" />
                Responsive MVP
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600" />
                Supabase Auth ready
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600" />
                MVP first workflow
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-10 top-12 h-28 w-28 rounded-full bg-sky-300/40 blur-3xl" />
            <div className="absolute -right-6 bottom-0 h-36 w-36 rounded-full bg-amber-300/40 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-slate-950 p-6 text-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.65)]">
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <div>
                  <p className="text-sm text-slate-400">Today</p>
                  <p className="mt-1 text-2xl font-semibold">Academic dashboard</p>
                </div>
                <div className="rounded-full bg-emerald-400/15 px-3 py-1 text-sm text-emerald-300">
                  Focus mode
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/8 p-4">
                  <p className="text-sm text-slate-400">GPA</p>
                  <p className="mt-3 text-3xl font-semibold">0.00</p>
                  <p className="mt-2 text-sm text-slate-400">Ready for first entries</p>
                </div>
                <div className="rounded-2xl bg-white/8 p-4">
                  <p className="text-sm text-slate-400">Pomodoro</p>
                  <p className="mt-3 text-3xl font-semibold">25 min</p>
                  <p className="mt-2 text-sm text-slate-400">Focus session default</p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {highlights.map((item) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={item.title}
                      className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/6 p-4"
                    >
                      <div className="rounded-xl bg-white/10 p-2">
                        <Icon className="size-5 text-sky-200" />
                      </div>
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-400">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
