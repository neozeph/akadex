"use client"

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts"

import type { GwaBySemesterPoint } from "@/app/(dashboard)/analytics/data"

type GwaBySemesterChartProps = {
  data: GwaBySemesterPoint[]
}

function GwaTooltip({ active, payload }: TooltipContentProps) {
  const point = payload?.[0]?.payload as GwaBySemesterPoint | undefined

  if (!active || !point || point.gwa === null) {
    return null
  }

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-popover-foreground">{point.fullLabel}</p>
      <p className="text-muted-foreground">GWA: {point.gwa.toFixed(2)}</p>
    </div>
  )
}

/**
 * Y-axis is reversed (1.00 at top, 5.00 at bottom) so a visually higher
 * point reads as a stronger grade, matching the Philippine 1.00–5.00 scale
 * where lower is better — confirmed via recharts' YAxis `reversed` prop
 * rather than transforming the underlying GWA values themselves.
 *
 * Semesters with no graded subjects have `gwa: null` (never 0) — Line's
 * `connectNulls={false}` (recharts' own default, passed explicitly here to
 * document the choice) renders that as a real gap in the series instead of
 * drawing through a fabricated zero.
 */
export function GwaBySemesterChart({ data }: GwaBySemesterChartProps) {
  return (
    <div>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="var(--muted-foreground)"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
            />
            <YAxis
              domain={[1, 5]}
              ticks={[1, 2, 3, 4, 5]}
              reversed
              stroke="var(--muted-foreground)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={36}
              tickFormatter={(value: number) => value.toFixed(2)}
            />
            <Tooltip content={GwaTooltip} cursor={{ stroke: "var(--border)" }} />
            <Line
              type="monotone"
              dataKey="gwa"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={{ r: 4, fill: "var(--primary)", strokeWidth: 0 }}
              activeDot={{ r: 6 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Accessible fallback: the same semester/GWA pairs the chart shows
          visually, available to screen readers without depending on
          hover/focus tooltips. */}
      <table className="sr-only">
        <caption>GWA by semester</caption>
        <thead>
          <tr>
            <th scope="col">Semester</th>
            <th scope="col">GWA</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.semesterId}>
              <td>{point.fullLabel}</td>
              <td>{point.gwa === null ? "No grades recorded" : point.gwa.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
