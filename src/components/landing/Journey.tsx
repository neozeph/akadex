"use client"

import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

const STEPS = [
  { number: "01", title: "Plan", description: "Create your semester and organize your subjects." },
  { number: "02", title: "Organize", description: "Plan tasks across actual dates, including recurring ones." },
  { number: "03", title: "Focus", description: "Use Pomodoro when it's time to sit down and work." },
  { number: "04", title: "Track", description: "Record final grades and watch your GWA update automatically." },
  { number: "05", title: "Understand", description: "Use Analytics to see how your academic habits develop." },
] as const

/**
 * Progressive enhancement, not scroll-jacking: normal browser scroll is
 * untouched throughout. IntersectionObserver only decides which step gets
 * the "active" highlight as it crosses the middle of the viewport — with
 * JS disabled (or before hydration) every step is still fully readable, in
 * order, with no animation dependency.
 */
export function Journey() {
  const [activeIndex, setActiveIndex] = useState(0)
  const stepRefs = useRef<Array<HTMLDivElement | null>>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue
          }
          const index = stepRefs.current.findIndex((el) => el === entry.target)
          if (index !== -1) {
            setActiveIndex(index)
          }
        }
      },
      { rootMargin: "-42% 0px -42% 0px", threshold: 0 },
    )

    const elements = stepRefs.current.filter((el): el is HTMLDivElement => el !== null)
    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  return (
    <section id="journey" className="scroll-mt-24 px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <p className="font-accent text-xs font-semibold tracking-[0.32em] text-primary uppercase">
            Your academic journey with Akadex
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            From building your semester to understanding your progress.
          </h2>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[3.5rem_1fr] lg:gap-10">
          {/* Sticky numbered rail — desktop only. Mobile shows each step's
              number inline with its own card instead (below). */}
          <div className="hidden lg:block">
            <div className="sticky top-28 flex flex-col items-center gap-2">
              {STEPS.map((step, index) => (
                <div
                  key={step.number}
                  aria-hidden="true"
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-full border font-accent text-xs font-semibold transition-colors duration-300",
                    index === activeIndex
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {step.number}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            {STEPS.map((step, index) => (
              <div
                key={step.number}
                ref={(el) => {
                  stepRefs.current[index] = el
                }}
                className={cn(
                  "flex gap-4 rounded-[1.4rem] border p-6 transition-colors duration-300",
                  index === activeIndex ? "border-primary/60 bg-accent/30" : "border-border bg-card",
                )}
              >
                <div className="flex flex-col items-center lg:hidden">
                  <span
                    aria-hidden="true"
                    className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border font-accent text-[0.65rem] font-semibold text-muted-foreground"
                  >
                    {step.number}
                  </span>
                  {index < STEPS.length - 1 ? <span aria-hidden="true" className="mt-1 w-px flex-1 bg-border" /> : null}
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
