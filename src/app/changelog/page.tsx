import type { Metadata } from "next"

import { PageShell } from "@/components/landing/PageShell"

export const metadata: Metadata = {
  title: "Changelog",
  description: "See the latest updates and improvements to Akadex as the product continues to grow.",
}

const updates = [
  {
    version: "0.1.0",
    date: "June 2026",
    title: "Initial public launch",
    description: "The first version of Akadex introduced the landing experience, semester planning, GPA tracking, tasks, and focus sessions.",
  },
  {
    version: "0.1.1",
    date: "Upcoming",
    title: "Experience refinements",
    description: "Planned polish across onboarding, navigation, and the overall storytelling of the product experience.",
  },
]

export default function ChangelogPage() {
  return (
    <PageShell
      eyebrow="Changelog"
      title="A growing product, documented as it evolves."
      description="Akadex is actively shaping its roadmap, and this space will continue to capture the most important milestones along the way."
    >
      <div className="space-y-4">
        {updates.map((item) => (
          <article key={item.version} className="rounded-[1.6rem] border border-emerald-200/70 bg-card/85 p-7 shadow-sm dark:border-emerald-500/20">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                {item.version}
              </span>
              <span className="text-sm text-muted-foreground">{item.date}</span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-foreground">{item.title}</h2>
            <p className="mt-3 text-base leading-8 text-muted-foreground">{item.description}</p>
          </article>
        ))}
      </div>
    </PageShell>
  )
}
