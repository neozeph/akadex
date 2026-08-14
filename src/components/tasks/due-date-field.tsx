"use client"

import * as React from "react"
import { CalendarIcon, X } from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { formatFullDate, parseISODate, toISODate } from "@/lib/dates"
import { cn } from "@/lib/utils"

type DueDateFieldProps = {
  id?: string
  name?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

/**
 * Themed replacement for the native `<input type="date">`. Still submits a
 * plain `YYYY-MM-DD` string via a hidden input under `name` — tasks.due_date
 * is a Postgres DATE, never a timestamp, so the value never leaves this
 * component as anything but the ISO date string the rest of the app already
 * expects. Uses parseISODate/toISODate (both build/read local Y-M-D
 * components, never `new Date(isoString)`) so the selected day can't shift
 * across a timezone boundary between what's shown and what's submitted.
 */
export function DueDateField({ id, name = "due_date", value, onChange, disabled }: DueDateFieldProps) {
  const [open, setOpen] = React.useState(false)
  const selected = value ? parseISODate(value) : undefined

  return (
    <div className="relative">
      <input type="hidden" name={name} value={value} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            disabled={disabled}
            className={cn(
              "flex h-11 w-full items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-50",
              value ? "pr-9" : "text-muted-foreground",
            )}
          >
            <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate text-left">{value ? formatFullDate(value) : "Pick a date"}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              onChange(date ? toISODate(date) : "")
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>

      {value ? (
        <button
          type="button"
          disabled={disabled}
          aria-label="Clear due date"
          onClick={() => onChange("")}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  )
}
