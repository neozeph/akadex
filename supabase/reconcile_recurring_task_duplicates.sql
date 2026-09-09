begin;

-- Reconcile legacy recurring-task duplicates created by the old occurrence
-- generator. Review supabase/diagnose_recurring_task_duplicates.sql before
-- running this migration, and take a database backup first. Removed duplicate
-- task rows cannot be reconstructed automatically without a backup.
--
-- Active means a linked recurring task row with status <> 'done'. The current
-- schema has task_status enum values: 'todo', 'in_progress', and 'done', and
-- no soft-delete column.
--
-- Retention ranking per (user_id, series_id):
-- 1. unfinished rows due today or overdue, earliest due date first;
-- 2. otherwise unfinished future rows, nearest due date first;
-- 3. otherwise unfinished rows without due dates;
-- 4. created_at and id as deterministic tie-breakers.
--
-- Completed rows are never deleted. Non-recurring tasks are never deleted.

with ranked_active_tasks as (
  select
    t.id,
    row_number() over (
      partition by t.user_id, t.series_id
      order by
        case
          when t.due_date is not null and t.due_date <= current_date then 0
          when t.due_date is not null and t.due_date > current_date then 1
          else 2
        end,
        t.due_date asc nulls last,
        t.created_at asc,
        t.id asc
    ) as retained_rank,
    count(*) over (partition by t.user_id, t.series_id) as active_rows_in_series
  from public.tasks t
  join public.task_series s
    on s.id = t.series_id
   and s.user_id = t.user_id
  where t.series_id is not null
    and t.status <> 'done'
),
duplicate_tasks_to_remove as (
  select id
  from ranked_active_tasks
  where active_rows_in_series > 1
    and retained_rank > 1
)
delete from public.tasks t
using duplicate_tasks_to_remove d
where t.id = d.id;

-- The previous unique index covered every status. Rolling recurrence needs to
-- preserve completed historical rows even when the active row later rolls back
-- onto the same calendar date in a future cycle, so uniqueness must apply only
-- to unfinished recurring rows.
drop index if exists public.tasks_series_due_date_unique;

create unique index if not exists tasks_one_active_recurring_task_per_series
  on public.tasks (series_id)
  where series_id is not null
    and status <> 'done';

commit;
