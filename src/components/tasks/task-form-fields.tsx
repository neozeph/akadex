"use client"

import * as React from "react"

import {
  formatTaskPriority,
  formatTaskStatus,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
} from "@/lib/tasks"
import { RECURRENCE_OPTIONS, formatRecurrenceOption, type RecurrenceOption } from "@/lib/recurrence"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DueDateField } from "@/components/tasks/due-date-field"

export type TaskSubjectOption = {
  id: string
  label: string
}

type TaskFormFieldsProps = {
  disabled: boolean
  subjects: TaskSubjectOption[]
  /**
   * Only true on the create form. Occurrence edits never touch task_series,
   * so the Repeat control (and the series it would create) has no place on
   * the edit form — MVP behavior is "edit this occurrence only," full stop.
   */
  showRecurrence?: boolean
  defaultValues?: {
    title?: string
    description?: string
    tags?: string
    dueDate?: string
    priority?: string
    status?: string
    subjectId?: string
    repeat?: RecurrenceOption
  }
}

// Radix Select.Item forbids an empty-string value (it's reserved to mean
// "no selection" internally), but "" is the real, meaningful value for
// "No Subject" in the submitted form data. This sentinel exists only inside
// the Select's own wire protocol — ThemedSelect translates it back to ""
// immediately via the hidden input that actually carries the form field.
const EMPTY_VALUE_SENTINEL = "__none__"

function ThemedSelect({
  id,
  name,
  value,
  onChange,
  disabled,
  options,
}: {
  id: string
  name: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  options: { value: string; label: string }[]
}) {
  const radixValue = value === "" ? EMPTY_VALUE_SENTINEL : value

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Select
        value={radixValue}
        onValueChange={(next) => onChange(next === EMPTY_VALUE_SENTINEL ? "" : next)}
        disabled={disabled}
      >
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value || EMPTY_VALUE_SENTINEL} value={option.value || EMPTY_VALUE_SENTINEL}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )
}

/**
 * The task field set shared by CreateTaskDialog and EditTaskDialog, so the
 * two forms can't drift out of sync. Purely presentational — each caller
 * owns its own form element, submit handling, and mutation call.
 *
 * Laid out as two independent columns on md+ (identity/notes on the left,
 * short metadata fields on the right) so a long description doesn't push
 * the metadata fields further down the page — the pairing is presentation
 * only, every field still submits under its original `name`. Collapses to
 * a single column below md automatically via the grid's responsive classes.
 */
export function TaskFormFields({
  disabled,
  subjects,
  showRecurrence = false,
  defaultValues = {},
}: TaskFormFieldsProps) {
  const [repeat, setRepeat] = React.useState<RecurrenceOption>(defaultValues.repeat ?? "none")
  const [dueDate, setDueDate] = React.useState(defaultValues.dueDate ?? "")
  const [subjectId, setSubjectId] = React.useState(defaultValues.subjectId ?? "")
  const [priority, setPriority] = React.useState(defaultValues.priority ?? "medium")
  const [status, setStatus] = React.useState(defaultValues.status ?? "todo")
  const dueDateRequired = showRecurrence && repeat !== "none"

  const subjectOptions = [
    { value: "", label: "No Subject" },
    ...subjects.map((subject) => ({ value: subject.id, label: subject.label })),
  ]
  const priorityOptions = TASK_PRIORITY_OPTIONS.map((option) => ({
    value: option,
    label: formatTaskPriority(option),
  }))
  const statusOptions = TASK_STATUS_OPTIONS.map((option) => ({
    value: option,
    label: formatTaskStatus(option),
  }))
  const repeatOptions = RECURRENCE_OPTIONS.map((option) => ({
    value: option,
    label: formatRecurrenceOption(option),
  }))

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor="title">
            Task title
          </label>
          <input
            id="title"
            name="title"
            defaultValue={defaultValues.title}
            placeholder="Finish thesis chapter 1"
            className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary"
            disabled={disabled}
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={5}
            defaultValue={defaultValues.description}
            placeholder="Add notes or checklist items"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
            disabled={disabled}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor="tags">
            Tags
          </label>
          <input
            id="tags"
            name="tags"
            defaultValue={defaultValues.tags}
            placeholder="thesis, sql, capstone"
            className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor="subject_id">
            Subject
          </label>
          <ThemedSelect
            id="subject_id"
            name="subject_id"
            value={subjectId}
            onChange={setSubjectId}
            disabled={disabled}
            options={subjectOptions}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor="due_date">
            Due date
          </label>
          <DueDateField id="due_date" name="due_date" value={dueDate} onChange={setDueDate} disabled={disabled} />
          {dueDateRequired ? (
            <p className="mt-1 text-xs text-muted-foreground">Recurring tasks need a start date.</p>
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor="priority">
            Priority
          </label>
          <ThemedSelect
            id="priority"
            name="priority"
            value={priority}
            onChange={setPriority}
            disabled={disabled}
            options={priorityOptions}
          />
        </div>

        {showRecurrence ? (
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="repeat">
              Repeat
            </label>
            <ThemedSelect
              id="repeat"
              name="repeat"
              value={repeat}
              onChange={(next) => setRepeat(next as RecurrenceOption)}
              disabled={disabled}
              options={repeatOptions}
            />
          </div>
        ) : null}

        {!dueDateRequired ? (
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="status">
              Status
            </label>
            <ThemedSelect
              id="status"
              name="status"
              value={status}
              onChange={setStatus}
              disabled={disabled}
              options={statusOptions}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
