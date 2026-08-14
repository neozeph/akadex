"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts"

import type { TrendBucket } from "@/app/(dashboard)/analytics/activity-data"

type FocusTimeChartProps = {
  data: TrendBucket[]
}

function FocusTooltip({ active, payload }: TooltipContentProps) {
  const bucket = payload?.[0]?.payload as TrendBucket | undefined

  if (!active || !bucket) {
    return null
  }

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-popover-foreground">{bucket.label}</p>
      <p className="text-muted-foreground">{bucket.value} min focus</p>
    </div>
  )
}

/** Bar chart of completed-focus-session minutes per bucket — terracotta, matching Pomodoro's existing focus-mode color. Values are already converted to minutes by the data layer; the database stores seconds. */
export function FocusTimeChart({ data }: FocusTimeChartProps) {
  return (
    <div>
      <div style={{ width: "100%", height: 200 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="var(--muted-foreground)"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              interval="preserveStartEnd"
            />
            <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} width={32} />
            <Tooltip content={FocusTooltip} cursor={{ fill: "var(--muted)" }} />
            <Bar dataKey="value" fill="var(--terracotta)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <table className="sr-only">
        <caption>Focus time</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col">Focus minutes</th>
          </tr>
        </thead>
        <tbody>
          {data.map((bucket) => (
            <tr key={bucket.key}>
              <td>{bucket.label}</td>
              <td>{bucket.value} min</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
