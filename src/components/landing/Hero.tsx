import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { HeroBackground } from "@/components/landing/HeroBackground"
import { Reveal } from "@/components/landing/Reveal"

const PILLARS = ["Plan your week.", "Track your grades.", "Focus better.", "Understand your progress."]

/**
 * Immersive but bounded — min-h keeps this to roughly "fills most of a
 * normal laptop viewport" rather than an empty 1000px section, and always
 * leaves the section boundary (and therefore "more content below") visible
 * without forcing extra scroll.
 */
export function Hero() {
  return (
    <section id="top" className="scroll-mt-24">
      <HeroBackground className="flex min-h-[520px] w-full flex-col justify-center sm:min-h-[580px] lg:min-h-[660px]">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <Reveal className="max-w-2xl">
            <p className="font-accent text-sm font-semibold tracking-[0.35em] text-[#eaf3e6] uppercase">AKADEX</p>

            <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Your cozy academic companion.
            </h1>

            <ul className="mt-6 flex flex-col gap-1.5 text-lg text-[#eaf3e6] sm:text-xl">
              {PILLARS.map((line) => (
                <li key={line} className="flex items-center gap-2">
                  <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-[#eaf3e6]/70" />
                  {line}
                </li>
              ))}
            </ul>

            <p className="mt-6 max-w-xl text-base leading-7 text-[#eaf3e6]/85 sm:text-lg">
              Keep your academic life in one calm place — from semesters and tasks to focus sessions and real progress
              analytics.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/register">
                <Button size="lg" className="gap-2 px-6">
                  Get Started
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/40 bg-white/5 px-6 text-white hover:bg-white/15 hover:text-white"
                >
                  Sign In
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </HeroBackground>
    </section>
  )
}
