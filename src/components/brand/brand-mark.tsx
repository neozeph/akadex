import Image from "next/image"

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
      <Image
        src="/brand/akadex.svg"
        alt=""
        aria-hidden="true"
        width={48}
        height={48}
        className="size-12 shrink-0 rounded-2xl shadow-[0_18px_36px_-24px_rgba(16,26,36,0.45)]"
      />

      {showLabel ? (
        <div className="leading-tight">
          <p className="font-accent text-sm font-semibold tracking-[0.2em] uppercase text-foreground">
            AKADEX
          </p>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      ) : null}
    </div>
  )
}
