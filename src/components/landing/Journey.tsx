import { BookOpen, Flag, GraduationCap, Sparkles, Target, Trophy } from "lucide-react"

const milestones = [
  {
    title: "Start College",
    description: "Take the first step with a workspace that feels welcoming and organized from day one.",
    icon: Sparkles,
  },
  {
    title: "Create Your First Semester",
    description: "Lay out your subjects, deadlines, and goals in a calm, flexible structure.",
    icon: BookOpen,
  },
  {
    title: "Track Your Grades",
    description: "Watch your effort turn into progress with a clear picture of performance.",
    icon: Target,
  },
  {
    title: "Complete Your Tasks",
    description: "Keep assignments, priorities, and focus sessions moving forward without friction.",
    icon: Flag,
  },
  {
    title: "Stay Focused",
    description: "Use built-in tools to protect your concentration and build strong study habits.",
    icon: Trophy,
  },
  {
    title: "Graduate with Confidence",
    description: "Finish the journey knowing your plans, records, and progress were always within reach.",
    icon: GraduationCap,
  },
]

export function Journey() {
  return (
    <section id="journey" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-emerald-600 dark:text-emerald-300">
            Your academic journey
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            From your first semester to your final milestone.
          </h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Acadex supports every chapter of your academic path with a journey that feels grounded, motivating, and easy to follow.
          </p>
        </div>

        <div className="mt-12 space-y-4 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-4">
          {milestones.map((milestone, index) => {
            const Icon = milestone.icon
            return (
              <div key={milestone.title} className="relative rounded-[1.5rem] border border-emerald-200/70 bg-card/85 p-6 shadow-sm dark:border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-300">
                    <Icon className="size-5" />
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground">0{index + 1}</span>
                </div>
                <h3 className="mt-5 text-xl font-semibold text-foreground">{milestone.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{milestone.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
