import * as React from "react"

import { cn } from "@/lib/utils"

type ProgressProps = React.ComponentProps<"div"> & {
  value: number
  max?: number
}

function Progress({ className, value, max = 100, ...props }: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuemax={max}
      aria-valuemin={0}
      aria-valuenow={value}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted/70", className)}
      {...props}
    >
      <div
        className="h-full rounded-full bg-linear-to-r from-primary via-emerald-500 to-emerald-400 transition-all"
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

export { Progress }
