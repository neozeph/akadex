-- Read-only diagnostic for legacy recurring-task duplicates.
--
-- Active means a linked recurring task row with status <> 'done'. The current
-- schema has task_status enum values: 'todo', 'in_progress', and 'done', and
-- no soft-delete column.
--
-- This query reports every active task in a recurring series that has more
-- than one active linked task, including which row the cleanup migration would
-- retain and which rows it would remove. It does not modify data.

with ranked_active_tasks as (
  select
    t.user_id,
    t.series_id,
    s.recurrence_type,
    t.id as task_id,
    t.title,
    t.status,
    t.due_date,
    t.completed_at,
    t.created_at,
    count(*) over (partition by t.user_id, t.series_id) as active_rows_in_series,
    first_value(t.id) over (
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
    ) as retained_task_id
  from public.tasks t
  join public.task_series s
    on s.id = t.series_id
   and s.user_id = t.user_id
  where t.series_id is not null
    and t.status <> 'done'
)
select
  user_id,
  series_id,
  recurrence_type,
  task_id,
  title,
  status,
  due_date,
  completed_at,
  created_at,
  active_rows_in_series,
  retained_task_id,
  case when task_id = retained_task_id then 'retain' else 'remove' end as cleanup_action
from ranked_active_tasks
where active_rows_in_series > 1
order by
  user_id,
  series_id,
  cleanup_action desc,
  due_date asc nulls last,
  created_at asc,
  task_id asc;
