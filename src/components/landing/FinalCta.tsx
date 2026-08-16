import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Reveal } from "@/components/landing/Reveal"

export function FinalCta() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <Reveal className="rounded-[2rem] border border-primary/30 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_10%,var(--card))_0%,var(--card)_60%)] p-10 text-center shadow-sm sm:p-14">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Ready to build a calmer academic routine?
          </h2>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register">
              <Button size="lg" className="gap-2 px-6">
                Create your Akadex
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>

          <p className="mt-5 text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-foreground underline underline-offset-2">
              Sign in.
            </Link>
          </p>
        </Reveal>
      </div>
    </section>
  )
}
