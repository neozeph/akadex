import {
  formatTaskPriority,
  formatTaskStatus,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
} from "@/lib/tasks"

type TaskFormFieldsProps = {
  disabled: boolean
  defaultValues?: {
    title?: string
    description?: string
    tags?: string
    dueDate?: string
    priority?: string
    status?: string
  }
}

/**
 * The task field set shared by CreateTaskDialog and EditTaskDialog, so the
 * two forms can't drift out of sync. Purely presentational — each caller
 * owns its own form element, submit handling, and mutation call.
 */
export function TaskFormFields({ disabled, defaultValues = {} }: TaskFormFieldsProps) {
  return (
    <>
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
          rows={3}
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor="due_date">
            Due date
          </label>
          <input
            id="due_date"
            name="due_date"
            type="date"
            defaultValue={defaultValues.dueDate}
            className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary"
            disabled={disabled}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor="priority">
            Priority
          </label>
          <select
            id="priority"
            name="priority"
            defaultValue={defaultValues.priority ?? "medium"}
            className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary"
            disabled={disabled}
          >
            {TASK_PRIORITY_OPTIONS.map((priority) => (
              <option key={priority} value={priority}>
                {formatTaskPriority(priority)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor="status">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={defaultValues.status ?? "todo"}
          className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary"
          disabled={disabled}
        >
          {TASK_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {formatTaskStatus(status)}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}
