import { BarChart3, BookMarked, Clock3, LockKeyhole, Sparkles, SquareCheckBig, Trophy } from "lucide-react"

const features = [
  {
    title: "Semester Management",
    description: "Create, refine, and revisit every semester with a calm overview that keeps your studies moving forward.",
    icon: BookMarked,
  },
  {
    title: "GPA Tracker",
    description: "Watch your academic performance unfold with a clear view of grades and progress over time.",
    icon: BarChart3,
  },
  {
    title: "Academic Tasks",
    description: "Set priorities, track deadlines, and keep every assignment visible from one polished board.",
    icon: SquareCheckBig,
  },
  {
    title: "Pomodoro Focus",
    description: "Stay in flow with built-in focus sessions designed to help deep work feel manageable.",
    icon: Clock3,
  },
  {
    title: "Academic Dashboard",
    description: "Turn scattered information into meaningful insight with a dashboard that feels effortless to read.",
    icon: Sparkles,
  },
  {
    title: "Secure Cloud Sync",
    description: "Your academic records are safely stored, ready whenever you need to continue your journey.",
    icon: LockKeyhole,
  },
]

export function Features() {
  return (
    <section id="features" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-emerald-600 dark:text-emerald-300">
            Everything you need for your academic journey
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            A thoughtful workspace for planning, focus, and progress.
          </h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Each feature is designed to make the everyday rhythm of college feel lighter, clearer, and more rewarding.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <article
                key={feature.title}
                className="group rounded-[1.4rem] border border-emerald-200/70 bg-card/85 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-soft dark:border-emerald-500/20"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 transition-colors group-hover:bg-emerald-500/15 dark:text-emerald-300">
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{feature.description}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
