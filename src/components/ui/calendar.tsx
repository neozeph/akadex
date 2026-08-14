"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, type ChevronProps } from "react-day-picker"

import { cn } from "@/lib/utils"

function CalendarChevron({ orientation, className }: ChevronProps) {
  const Icon = orientation === "right" ? ChevronRight : ChevronLeft
  return <Icon className={cn("size-4", className)} />
}

type CalendarProps = React.ComponentProps<typeof DayPicker>

/**
 * Themed wrapper around react-day-picker, styled with the same design
 * tokens as the rest of Akadex (no bespoke colors) so light/dark stay in
 * sync automatically with the app theme.
 */
function Calendar({ className, classNames, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays
      className={cn("p-1", className)}
      classNames={{
        months: "flex flex-col gap-2",
        month: "flex flex-col gap-3",
        month_caption: "flex items-center justify-center pt-1 pb-2 relative",
        caption_label: "text-sm font-semibold text-foreground",
        nav: "flex items-center justify-between absolute inset-x-0 top-0.5",
        button_previous: cn(
          "inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-accent-foreground disabled:opacity-30",
        ),
        button_next: cn(
          "inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-accent-foreground disabled:opacity-30",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-9 text-center text-[0.7rem] font-medium text-muted-foreground uppercase",
        week: "flex w-full mt-1",
        day: "size-9 p-0 text-center text-sm",
        day_button: cn(
          "size-9 rounded-lg text-sm font-medium text-foreground transition outline-none",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:ring-2 focus-visible:ring-ring",
        ),
        selected: "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary-hover",
        today: "[&>button]:border [&>button]:border-primary [&>button]:font-semibold",
        outside: "[&>button]:text-muted-foreground/50",
        disabled: "[&>button]:text-muted-foreground/30 [&>button]:pointer-events-none",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: CalendarChevron,
      }}
      {...props}
    />
  )
}

export { Calendar }
