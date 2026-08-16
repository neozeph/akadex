"use client"

import { useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type RevealProps = {
  children: ReactNode
  className?: string
  /** Stagger offset in ms, applied via transition-delay. */
  delayMs?: number
}

/**
 * Small, dependency-free entrance reveal: fades/slides content in once it
 * enters the viewport. Deterministic initial markup (always starts
 * "not yet revealed" on both server and first client render) so hydration
 * never mismatches — the IntersectionObserver only runs after mount, same
 * pattern already used by Journey's active-step highlighting.
 *
 * `.reveal` is forced fully visible under prefers-reduced-motion and
 * scripting:none (see globals.css) so content never depends on animation.
 */
export function Reveal({ children, className, delayMs = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={cn(
        "reveal transition-[opacity,transform] duration-500 ease-out",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
        className,
      )}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  )
}
