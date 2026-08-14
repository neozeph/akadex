import Link from "next/link"

import { Button } from "@/components/ui/button"
import type { AnalyticsRange } from "@/app/(dashboard)/analytics/activity-data"

type AnalyticsRangePickerProps = {
  range: AnalyticsRange
}

const RANGE_OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "all", label: "All Time" },
]

/**
 * Plain links (not client-side state) so the selected range lives in the
 * URL — shareable, survives refresh — same pattern the Tasks status chips
 * already use. Only affects the Study Activity sections below it; Academic
 * Performance never reads this value.
 */
export function AnalyticsRangePicker({ range }: AnalyticsRangePickerProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Study activity timeframe">
      {RANGE_OPTIONS.map((option) => (
        <Button key={option.value} asChild variant={range === option.value ? "default" : "outline"} size="sm">
          <Link href={`/analytics?range=${option.value}`} aria-current={range === option.value ? "true" : undefined}>
            {option.label}
          </Link>
        </Button>
      ))}
    </div>
  )
}
