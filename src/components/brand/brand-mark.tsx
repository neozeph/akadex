import { Sprout } from "lucide-react"

import { cn } from "@/lib/utils"

type BrandMarkProps = {
  className?: string
  showLabel?: boolean
  subtitle?: string
}

export function BrandMark({
  className,
  showLabel = true,
  subtitle = "Student productivity workspace",
}: BrandMarkProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative flex size-12 items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(135deg,var(--primary),color-mix(in_oklch,var(--primary)_62%,white_38%))] shadow-[0_18px_36px_-24px_rgba(16,185,129,0.8)] ring-1 ring-white/40 dark:ring-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.32),transparent_50%)]" />
        <Sprout className="relative size-6 text-white" />
      </div>

      {showLabel ? (
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-[0.24em] uppercase text-foreground">
            Acadex
          </p>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      ) : null}
    </div>
  )
}
