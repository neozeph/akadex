import { toISODate } from "@/lib/dates"
import { PageHeader } from "@/components/ui/page-header"
import { TaskBoard } from "@/components/tasks/task-board"
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog"
import { TasksSearchToolbar } from "@/components/tasks/tasks-search-toolbar"

import { createTask, deleteTask, setTaskCompletion, updateTask } from "./actions"
import { getTaskPlannerData, type TasksSearchParams } from "./data"

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<TasksSearchParams>
}) {
  const resolvedSearchParams = await searchParams
  const { tasks, subjects } = await getTaskPlannerData(resolvedSearchParams)
  const activeFilterCount = [
    resolvedSearchParams.q?.trim(),
    resolvedSearchParams.status,
    resolvedSearchParams.subject,
    resolvedSearchParams.priority,
  ].filter(Boolean).length

  const todayISO = toISODate(new Date())

  return (
    <main className="space-y-4">
      <PageHeader
        title="Tasks"
        description="Manage your academic and personal tasks."
        action={<CreateTaskDialog onCreate={createTask} subjects={subjects} />}
      />

      <section className="rounded-xl border border-border bg-card p-2.5 shadow-sm">
        <TasksSearchToolbar
          searchParams={resolvedSearchParams}
          subjects={subjects}
          hasActiveFilters={activeFilterCount > 0}
        />
      </section>

      <TaskBoard
        tasks={tasks}
        hasActiveFilters={activeFilterCount > 0}
        todayISO={todayISO}
        subjects={subjects}
        onCreateTask={createTask}
        onDeleteTask={deleteTask}
        onUpdateTask={updateTask}
        onSetTaskCompletion={setTaskCompletion}
      />
    </main>
  )
}
