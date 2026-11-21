create table public.task_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  series_id uuid references public.task_series(id) on delete set null,
  occurrence_date date not null,
  completed_at timestamptz not null default now(),
  unique (task_id, occurrence_date)
);
create index task_completions_owner_time on public.task_completions(user_id, completed_at);
alter table public.task_completions enable row level security;
revoke all on public.task_completions from public, anon, authenticated;
grant select on public.task_completions to authenticated;
create policy "Owners read completion history" on public.task_completions
  for select to authenticated using (user_id = auth.uid());

create function public.complete_recurring_task(p_task_id uuid, p_occurrence_date date)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  task public.tasks%rowtype;
  series public.task_series%rowtype;
  zone text;
  cutoff date;
  next_date date;
  month_start date;
  anchor_day integer;
  step integer;
begin
  if owner_id is null then raise exception 'Unauthorized' using errcode = '42501'; end if;
  if p_occurrence_date is null then raise exception 'Occurrence date required' using errcode = '22023'; end if;

  select * into task from public.tasks
    where id = p_task_id and user_id = owner_id for update;
  if not found then raise exception 'Task not found' using errcode = '42501'; end if;
  select * into series from public.task_series
    where id = task.series_id and user_id = owner_id and active for update;
  if not found then raise exception 'Active recurring task not found' using errcode = '42501'; end if;
  if task.status = 'done' or task.due_date is distinct from p_occurrence_date then return false; end if;
  if exists (select 1 from public.task_completions where task_id = task.id and occurrence_date = p_occurrence_date) then return false; end if;

  select timezone into zone from public.profiles where id = owner_id;
  zone := coalesce(zone, 'Asia/Manila');
  cutoff := greatest((current_timestamp at time zone zone)::date, task.due_date);
  if series.recurrence_type = 'monthly' then
    anchor_day := extract(day from series.start_date)::integer;
    month_start := date_trunc('month', greatest(cutoff, series.start_date))::date;
    loop
      next_date := month_start + anchor_day - 1;
      if extract(month from next_date) = extract(month from month_start) and next_date > cutoff and next_date >= series.start_date then exit; end if;
      month_start := (month_start + interval '1 month')::date;
    end loop;
  else
    step := case when series.recurrence_type = 'weekly' then 7 else 1 end;
    next_date := series.start_date + (greatest(0, cutoff - series.start_date) / step + 1) * step;
    if series.recurrence_type = 'weekdays' then
      while extract(isodow from next_date) in (6, 7) loop next_date := next_date + 1; end loop;
    end if;
  end if;

  update public.tasks set status = 'todo', completed_at = null, due_date = next_date
    where id = task.id and user_id = owner_id;
  insert into public.task_completions(user_id, task_id, series_id, occurrence_date)
    values(owner_id, task.id, series.id, p_occurrence_date);
  return true;
end;
$$;
revoke all on function public.complete_recurring_task(uuid,date) from public, anon;
grant execute on function public.complete_recurring_task(uuid,date) to authenticated;
notify pgrst, 'reload schema';
