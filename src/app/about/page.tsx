import type { Metadata } from "next"
import { Compass, GraduationCap, Sparkles, Trees } from "lucide-react"

import { PageShell } from "@/components/landing/PageShell"

export const metadata: Metadata = {
  title: "About Akadeks",
  description: "The story behind Akadeks and the mission to help students build calm, confident academic habits.",
}

const pillars = [
  {
    title: "A calmer way to study",
    description: "Akadeks helps students make sense of semesters, tasks, and progress without turning school into friction.",
    icon: Compass,
  },
  {
    title: "Built for growth",
    description: "The product is designed around momentum: one semester, one milestone, one better habit at a time.",
    icon: Sparkles,
  },
  {
    title: "Made for the long path",
    description: "From first-year plans to graduation goals, Akadeks grows with each student's journey.",
    icon: GraduationCap,
  },
]

export default function AboutPage() {
  return (
    <PageShell
      eyebrow="About Akadeks"
      title="Helping students turn busy semesters into a clear, rewarding path."
      description="Akadeks began as a simple idea: academic life should feel guided, not overwhelming. We built a workspace that brings planning, focus, and progress together in one calm place."
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.7rem] border border-emerald-200/70 bg-card/85 p-8 shadow-sm dark:border-emerald-500/20">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
            <Trees className="size-5" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-foreground">The mission</h2>
          <p className="mt-3 text-base leading-8 text-muted-foreground">
            Akadeks exists to make college life feel more intentional. Students should be able to plan their semester, track their growth, and protect their focus without getting buried in scattered tools.
          </p>
          <p className="mt-4 text-base leading-8 text-muted-foreground">
            We believe academic success is shaped by habits, clarity, and steady progress. Akadeks is here to support each of those.
          </p>
        </div>

        <div className="space-y-4">
          {pillars.map((pillar) => {
            const Icon = pillar.icon
            return (
              <div key={pillar.title} className="rounded-[1.4rem] border border-border/70 bg-background/70 p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-300">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{pillar.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{pillar.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </PageShell>
  )
}
