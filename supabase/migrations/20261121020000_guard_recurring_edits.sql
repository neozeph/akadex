create function public.guard_recurring_task_edits()
returns trigger language plpgsql set search_path = '' as $$
declare series_owner uuid; series_active boolean;
begin
  if tg_op = 'UPDATE' then
    if old.series_id is not null and new.series_id is distinct from old.series_id
      and exists (select 1 from public.task_series where id = old.series_id and active) then
      raise exception 'Cannot detach an active recurring occurrence' using errcode = '23514';
    end if;
  end if;
  if new.series_id is null then return new; end if;
  select user_id, active into series_owner, series_active from public.task_series where id = new.series_id;
  if series_owner is distinct from new.user_id then raise exception 'Invalid recurring series' using errcode = '23514'; end if;
  if not series_active then return new; end if;
  if new.due_date is null then raise exception 'Recurring date required' using errcode = '23514'; end if;
  if new.status = 'done' then
    if tg_op = 'INSERT' then raise exception 'Use atomic completion' using errcode = '23514'; end if;
    if old.status <> 'done' then raise exception 'Use atomic completion' using errcode = '23514'; end if;
  end if;
  if exists (select 1 from public.task_completions where task_id = new.id and occurrence_date = new.due_date) then
    raise exception 'Occurrence already completed' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_recurring_task_edits() from public, anon, authenticated;
create trigger guard_recurring_task_edits before insert or update on public.tasks
  for each row execute function public.guard_recurring_task_edits();
notify pgrst, 'reload schema';
