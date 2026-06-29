import Link from "next/link"
import { ArrowRight, BookOpen, Compass, GraduationCap, Map, Sparkles, Trophy } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const highlights = [
  { label: "Semesters", value: "6" },
  { label: "Tasks tracked", value: "120+" },
  { label: "Focus sessions", value: "24/7" },
]

function HeroIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.16),transparent_36%)]" />
      <div className="relative overflow-hidden rounded-[2rem] border border-emerald-200/70 bg-card/95 p-4 shadow-[0_40px_120px_-44px_rgba(5,150,105,0.4)] backdrop-blur-xl dark:border-emerald-500/20 dark:bg-slate-950/80 sm:p-6">
        <div className="absolute left-4 top-4 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-emerald-700 dark:text-emerald-300">
          Adventure map
        </div>

        <svg viewBox="0 0 560 420" className="w-full" role="img" aria-label="Illustration of books, a backpack, and a path toward a graduation cap">
          <rect x="40" y="40" width="480" height="340" rx="32" fill="url(#bg)" />
          <path d="M70 300C120 250 175 240 220 260C265 280 315 315 375 300C425 287 470 250 500 220" fill="none" stroke="#86efac" strokeWidth="7" strokeLinecap="round" strokeDasharray="8 12" />
          <path d="M70 315C130 282 200 280 255 300C307 318 372 332 495 292" fill="none" stroke="#fde68a" strokeWidth="7" strokeLinecap="round" opacity="0.7" />
          <path d="M110 308C150 265 183 248 220 250C280 254 310 295 364 307" fill="none" stroke="#3b82f6" strokeWidth="6" strokeLinecap="round" opacity="0.65" />
          <path d="M95 315C135 280 190 268 237 280" fill="none" stroke="#f87171" strokeWidth="5" strokeLinecap="round" opacity="0.7" />
          <circle cx="430" cy="125" r="18" fill="#fef3c7" />
          <path d="M421 125L430 108L439 125" fill="#f59e0b" opacity="0.8" />
          <path d="M430 143V156" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
          <rect x="120" y="158" width="140" height="112" rx="16" fill="#ffffff" stroke="#d1fae5" strokeWidth="3" />
          <rect x="140" y="176" width="96" height="8" rx="4" fill="#10b981" opacity="0.8" />
          <rect x="140" y="198" width="84" height="8" rx="4" fill="#93c5fd" opacity="0.8" />
          <rect x="140" y="220" width="72" height="8" rx="4" fill="#fbbf24" opacity="0.8" />
          <path d="M310 158L360 128L410 158V260H310Z" fill="#0f766e" />
          <path d="M314 161L360 135L404 161V255H314Z" fill="#14b8a6" opacity="0.9" />
          <path d="M325 176H395" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
          <path d="M325 195H382" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
          <path d="M325 214H370" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" opacity="0.68" />
          <path d="M286 250L325 220L359 255L318 290Z" fill="#f59e0b" opacity="0.88" />
          <path d="M318 289L334 250L366 249L349 290Z" fill="#fbbf24" opacity="0.9" />
          <path d="M342 215H398" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" opacity="0.75" />
          <path d="M265 160L300 132L341 160" fill="none" stroke="#1f2937" strokeWidth="4" strokeLinecap="round" />
          <path d="M295 132L318 108L350 128" fill="none" stroke="#1f2937" strokeWidth="4" strokeLinecap="round" />
          <rect x="340" y="228" width="84" height="64" rx="14" fill="#f8fafc" stroke="#10b981" strokeWidth="3" />
          <path d="M365 258L386 238L404 255" fill="none" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <g transform="translate(96 268)">
            <path d="M26 0C44 13 51 39 44 60C37 80 19 94 0 94" fill="none" stroke="#16a34a" strokeWidth="10" strokeLinecap="round" opacity="0.8" />
            <path d="M0 72C14 64 29 58 43 51" fill="none" stroke="#0f766e" strokeWidth="6" strokeLinecap="round" opacity="0.75" />
            <path d="M100 0L82 38H118Z" fill="#3b82f6" />
            <path d="M82 38H118L100 72Z" fill="#60a5fa" />
            <path d="M70 38H130" stroke="#1d4ed8" strokeWidth="5" strokeLinecap="round" />
          </g>
          <g transform="translate(420 250)">
            <path d="M0 76C16 58 44 44 70 42C88 41 104 46 122 57" fill="none" stroke="#f59e0b" strokeWidth="8" strokeLinecap="round" />
            <path d="M58 0C70 18 69 40 52 54" fill="none" stroke="#fbbf24" strokeWidth="8" strokeLinecap="round" />
          </g>
          <defs>
            <linearGradient id="bg" x1="40" y1="40" x2="520" y2="380" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f8fafc" />
              <stop offset="1" stopColor="#ecfdf5" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  )
}

export function Hero() {
  return (
    <section id="home" className="scroll-mt-24 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div className="max-w-2xl">
          <Badge variant="secondary" className="gap-2 px-3 py-1.5 rounded-full border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
            <Sparkles className="size-3.5" />
            Designed for calm, focused academic growth
          </Badge>

          <h1 className="mt-6 font-heading text-4xl font-bold leading-[0.95] tracking-tight text-foreground sm:text-5xl lg:text-7xl">
            Your academic adventure starts here.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
            Organize your semesters, track your GPA, manage every assignment, and stay productive in one beautiful workspace that feels like progress instead of pressure.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/register">
              <Button size="lg" className="gap-2 px-6">
                Start Your Adventure
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="lg" className="px-6">
                Learn More
              </Button>
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {highlights.map((item) => (
              <div key={item.label} className="rounded-full border border-border/70 bg-card/70 px-3 py-2 text-sm text-muted-foreground shadow-sm">
                <span className="font-semibold text-foreground">{item.value}</span> {item.label}
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-8 top-8 h-24 w-24 rounded-full bg-emerald-300/40 blur-3xl dark:bg-emerald-400/20" />
          <div className="absolute -right-6 bottom-8 h-28 w-28 rounded-full bg-amber-300/35 blur-3xl dark:bg-amber-400/20" />
          <HeroIllustration />
        </div>
      </div>

      <div className="mx-auto mt-14 grid max-w-7xl gap-4 rounded-[1.75rem] border border-emerald-200/70 bg-white/80 p-6 shadow-soft backdrop-blur-xl sm:grid-cols-3 dark:border-emerald-500/20 dark:bg-slate-900/70 lg:mt-20 lg:p-8">
        {[
          {
            icon: BookOpen,
            title: "Semester planner",
            description: "Map each semester with clarity and confidence.",
          },
          {
            icon: Compass,
            title: "Guided momentum",
            description: "Follow your path with visible milestones and progress.",
          },
          {
            icon: GraduationCap,
            title: "Graduation-ready",
            description: "Build habits that carry you from day one to commencement.",
          },
        ].map((item) => {
          const Icon = item.icon
          return (
            <div key={item.title} className="flex items-start gap-3 rounded-2xl bg-background/70 p-4">
              <div className="rounded-2xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-300">
                <Icon className="size-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
