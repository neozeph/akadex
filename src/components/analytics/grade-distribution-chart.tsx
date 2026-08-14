"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts"

import type { GradeDistributionBar } from "@/app/(dashboard)/analytics/data"

type GradeDistributionChartProps = {
  data: GradeDistributionBar[]
}

function GradeTooltip({ active, payload }: TooltipContentProps) {
  const bar = payload?.[0]?.payload as (GradeDistributionBar & { label: string }) | undefined

  if (!active || !bar) {
    return null
  }

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-popover-foreground">Grade {bar.label}</p>
      <p className="text-muted-foreground">
        {bar.count} subject{bar.count === 1 ? "" : "s"}
      </p>
    </div>
  )
}

/**
 * Counts by exact grade (Akadex's finite 1.00–5.00 scale) rather than
 * arbitrary ranges — a plain bar chart, not a pie chart, since there are too
 * many grade categories for a pie to stay readable. Ungraded subjects are
 * never counted here; they're reported as a separate figure alongside this
 * chart instead.
 */
export function GradeDistributionChart({ data }: GradeDistributionChartProps) {
  const chartData = data.map((bar) => ({ ...bar, label: bar.grade.toFixed(2) }))

  return (
    <div>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="var(--muted-foreground)"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
            />
            <YAxis
              allowDecimals={false}
              stroke="var(--muted-foreground)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={28}
            />
            <Tooltip content={GradeTooltip} cursor={{ fill: "var(--muted)" }} />
            <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Accessible fallback for screen readers, independent of hover/focus. */}
      <table className="sr-only">
        <caption>Grade distribution</caption>
        <thead>
          <tr>
            <th scope="col">Grade</th>
            <th scope="col">Subjects</th>
          </tr>
        </thead>
        <tbody>
          {data.map((bar) => (
            <tr key={bar.grade}>
              <td>{bar.grade.toFixed(2)}</td>
              <td>{bar.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
