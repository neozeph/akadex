import { cn } from "@/lib/utils"

const DAY_LABELS = ["MON", "TUE", "WED", "THU"]

const HOVER_DELAYS = ["delay-0", "delay-75", "delay-150", "delay-300"] as const

/** Mini planner preview: a handful of day columns with task-length bars, echoing the real Weekly Tasks Planner. Bars highlight sequentially on hover, left to right. */
function PlanVisual() {
  return (
    <div className="flex gap-2.5">
      {DAY_LABELS.map((day, index) => (
        <div key={day} className="flex flex-1 flex-col gap-1.5 rounded-xl border border-border/70 bg-background/60 p-2">
          <span className="font-accent text-[0.55rem] font-semibold tracking-[0.12em] text-muted-foreground">
            {day}
          </span>
          <span
            className={cn(
              "h-6 rounded-md transition-colors duration-300 ease-out group-hover:bg-primary",
              index % 2 === 0 ? "bg-primary/70" : "bg-primary/35",
              HOVER_DELAYS[index],
            )}
          />
          {index !== 1 ? (
            <span
              className={cn(
                "h-4 rounded-md bg-terracotta/40 transition-colors duration-300 ease-out group-hover:bg-terracotta/70",
                HOVER_DELAYS[index],
              )}
            />
          ) : null}
        </div>
      ))}
    </div>
  )
}

/** Mini semester-folder + GWA badge, echoing SemesterCard/Semester Overview. Folder border/accent shifts to primary on hover. */
function TrackVisual() {
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 120 70" className="h-14 w-24 shrink-0" aria-hidden="true">
        <path
          d="M6 20 Q6 12 15 12 H46 Q52 12 56 16 L62 22 H105 Q114 22 114 30 V58 Q114 66 105 66 H14 Q6 66 6 58 Z"
          className="fill-card stroke-border transition-colors duration-300 ease-out group-hover:stroke-primary"
          strokeWidth="2"
        />
        <path
          d="M15 12 H46 Q52 12 56 16 L62 22 H6 V20 Q6 12 15 12 Z"
          className="fill-accent transition-colors duration-300 ease-out group-hover:fill-primary/60"
        />
      </svg>
      <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-2 transition-colors duration-300 ease-out group-hover:border-primary/50">
        <p className="text-[0.6rem] font-medium tracking-wide text-muted-foreground uppercase">GWA</p>
        <p className="text-lg font-semibold text-foreground">1.75</p>
      </div>
    </div>
  )
}

/** Mini timer ring, echoing the actual Pomodoro conic-gradient ring. Rotates slightly and gains a terracotta glow on hover. */
function FocusVisual() {
  return (
    <div className="flex items-center gap-4">
      <div
        className="relative flex size-16 shrink-0 items-center justify-center rounded-full transition-[transform,box-shadow] duration-300 ease-out group-hover:shadow-[0_0_0_4px_color-mix(in_srgb,var(--terracotta)_18%,transparent)] motion-safe:group-hover:rotate-[20deg]"
        style={{ background: "conic-gradient(var(--terracotta) 0% 65%, transparent 65% 100%)" }}
        aria-hidden="true"
      >
        <div className="flex size-12 items-center justify-center rounded-full bg-card text-[0.7rem] font-semibold text-foreground">
          18:24
        </div>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">One focused round at a time.</p>
    </div>
  )
}

/** Mini bar chart, echoing the Analytics GWA/grade-distribution charts. Bars grow and brighten sequentially on hover. */
function UnderstandVisual() {
  const bars = [40, 70, 55, 90, 65]
  return (
    <div className="flex h-16 items-end gap-2" aria-hidden="true">
      {bars.map((height, index) => (
        <span
          key={index}
          className={cn(
            "w-3 origin-bottom rounded-t-md transition-[transform,background-color] duration-300 ease-out group-hover:bg-primary motion-safe:group-hover:scale-y-110",
            index === 3 ? "bg-primary" : "bg-primary/40",
            HOVER_DELAYS[index % HOVER_DELAYS.length],
          )}
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  )
}

const FEATURES = [
  {
    eyebrow: "PLAN",
    title: "Weekly task planner",
    description: "Lay tasks across real dates, including recurring ones, so nothing lives in a vague someday list.",
    visual: PlanVisual,
    span: "lg:col-span-2 lg:row-span-2",
  },
  {
    eyebrow: "TRACK",
    title: "Semesters, subjects & GWA",
    description: "Semesters, subjects, and grades stay organized with your GWA computed automatically.",
    visual: TrackVisual,
    span: "lg:col-span-2",
  },
  {
    eyebrow: "FOCUS",
    title: "Customizable Pomodoro",
    description: "Set your own focus and break lengths, then sit down and work without the tab-hopping.",
    visual: FocusVisual,
    span: "lg:col-span-1",
  },
  {
    eyebrow: "UNDERSTAND",
    title: "Real analytics",
    description: "See GWA trends, grade distribution, and study activity built from your actual recorded data.",
    visual: UnderstandVisual,
    span: "lg:col-span-1",
  },
] as const

export function Features() {
  return (
    <section id="features" className="scroll-mt-24 px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <p className="font-accent text-xs font-semibold tracking-[0.32em] text-primary uppercase">
            What Akadex does
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Plan, track, focus, and understand — in one place.
          </h2>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
          {FEATURES.map((feature) => {
            const Visual = feature.visual
            return (
              <article
                key={feature.eyebrow}
                className={cn(
                  "group flex flex-col justify-between gap-6 rounded-[1.4rem] border border-border bg-card p-6 shadow-sm transition-colors duration-200 hover:border-primary/50 hover:bg-accent/30",
                  feature.span,
                )}
              >
                <div>
                  <p className="font-accent text-[0.65rem] font-semibold tracking-[0.22em] text-primary uppercase">
                    {feature.eyebrow}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-foreground">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.description}</p>
                </div>

                <Visual />
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
