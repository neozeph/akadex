"use client"

import { useState } from "react"

import { Reveal } from "@/components/landing/Reveal"
import { cn } from "@/lib/utils"

const BEATS = [
  {
    number: "01",
    title: "Too many places",
    body: "I wanted one dashboard where I could see my semesters, subjects, and grades without jumping between spreadsheets and different tools.",
    node: "Grades",
  },
  {
    number: "02",
    title: "Organization changed everything",
    body: "The task board became a game changer. Giving work an actual place in the week made staying organized feel much more manageable.",
    node: "Tasks",
  },
  {
    number: "03",
    title: "Focus is hard",
    body: "Distractions are always one tab or notification away, so I added Pomodoro as a simple place to actually sit down and work.",
    node: "Focus",
  },
  {
    number: "04",
    title: "One calm space",
    body: "Akadex became the dashboard I wanted for myself — a place to plan, track, focus, and understand how things are going.",
    node: "Analytics",
  },
] as const

/**
 * Central node diagram — Grades/Tasks feed into Akadex, which feeds
 * Focus/Analytics back out. Hovering/focusing a story beat highlights its
 * matching node so the connection between story and product reads clearly
 * even before the copy is read.
 */
function StoryDiagram({ activeNode }: { activeNode: string | null }) {
  const isActive = (node: string) => activeNode === node

  return (
    <div className="flex w-full flex-col items-center gap-3" aria-hidden="true">
      <div className="grid w-full grid-cols-2 gap-2">
        {["Grades", "Tasks"].map((node) => (
          <span
            key={node}
            className={cn(
              "min-w-0 rounded-xl border px-2 py-1.5 text-center font-accent text-[0.6rem] font-semibold tracking-[0.06em] uppercase leading-snug transition-colors duration-300",
              isActive(node)
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-background/70 text-muted-foreground",
            )}
          >
            {node}
          </span>
        ))}
      </div>

      <div className="h-6 w-px bg-border" />

      <div className="rounded-2xl border border-primary/50 bg-primary/10 px-5 py-3">
        <p className="font-accent text-xs font-semibold tracking-[0.24em] text-primary uppercase">Akadex</p>
      </div>

      <div className="h-6 w-px bg-border" />

      <div className="grid w-full grid-cols-2 gap-2">
        {["Focus", "Analytics"].map((node) => (
          <span
            key={node}
            className={cn(
              "min-w-0 rounded-xl border px-2 py-1.5 text-center font-accent text-[0.6rem] font-semibold tracking-[0.06em] uppercase leading-snug transition-colors duration-300",
              isActive(node)
                ? "border-terracotta bg-terracotta/15 text-terracotta"
                : "border-border bg-background/70 text-muted-foreground",
            )}
          >
            {node}
          </span>
        ))}
      </div>
    </div>
  )
}

export function About() {
  const [activeNode, setActiveNode] = useState<string | null>(null)

  return (
    <section id="about" className="scroll-mt-24 px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[2rem] border border-border bg-card p-8 shadow-sm sm:p-10 lg:p-14">
          <div className="max-w-2xl">
            <p className="font-accent text-xs font-semibold tracking-[0.32em] text-primary uppercase">
              Why I built Akadex
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              &ldquo;I wanted one place for my academic life.&rdquo;
            </h2>
          </div>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-14">
            <div className="grid gap-4 sm:grid-cols-2">
              {BEATS.map((beat, index) => (
                <Reveal key={beat.number} delayMs={index * 90}>
                  <div
                    onMouseEnter={() => setActiveNode(beat.node)}
                    onMouseLeave={() => setActiveNode(null)}
                    onFocus={() => setActiveNode(beat.node)}
                    onBlur={() => setActiveNode(null)}
                    tabIndex={0}
                    className="h-full rounded-2xl border border-border/70 bg-background/50 p-5 transition-colors duration-200 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <p className="font-accent text-xs font-semibold text-primary/70">{beat.number}</p>
                    <h3 className="mt-1.5 text-sm font-semibold text-foreground">{beat.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{beat.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delayMs={360} className="mx-auto w-full max-w-64 lg:mx-0">
              <div className="rounded-2xl border border-border/70 bg-background/40 p-5">
                <StoryDiagram activeNode={activeNode} />
              </div>
            </Reveal>
          </div>

          <p className="mt-10 max-w-2xl text-sm leading-6 text-muted-foreground">
            Not a generic school app — the dashboard I wanted for myself.{" "}
            <span className="text-foreground">— Josef</span>
          </p>
        </div>
      </div>
    </section>
  )
}
