-- Invoker rights and explicit auth.uid predicates retain every table's RLS.
create function public.activity_report(p_today date, p_timezone text, p_range text)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare report jsonb; range_start timestamptz; range_end timestamptz;
begin
  if p_range not in ('7d','30d','all') or p_range is null or p_today is null then
    raise exception 'Invalid report range' using errcode = '22023';
  end if;
  range_start := case when p_range = 'all' then '-infinity'::timestamptz
    else (p_today - case when p_range = '7d' then 6 else 29 end)::timestamp at time zone p_timezone end;
  range_end := (p_today + 1)::timestamp at time zone p_timezone;
  with completions as (
    select t.completed_at as at from public.tasks t
    where t.user_id=auth.uid() and t.status='done'
      and t.completed_at >= range_start and t.completed_at < range_end
      and not exists(select 1 from public.task_completions e where e.user_id=auth.uid()
        and e.task_id=t.id and e.occurrence_date=t.due_date)
    union all
    select e.completed_at from public.task_completions e where e.user_id=auth.uid()
      and e.completed_at >= range_start and e.completed_at < range_end
  ), task_days as (
    select case when p_range='all' then date_trunc('month',at at time zone p_timezone)::date
      else (at at time zone p_timezone)::date end as day, count(*) as value
    from completions group by 1
  ), sessions as (
    select s.duration,s.ended_at from public.pomodoro_sessions s
    where s.user_id=auth.uid() and s.completed
      and s.ended_at >= range_start and s.ended_at < range_end
  ), focus_days as (
    select case when p_range='all' then date_trunc('month',ended_at at time zone p_timezone)::date
      else (ended_at at time zone p_timezone)::date end as day, sum(duration) as value
    from sessions group by 1
  )
  select jsonb_build_object(
    'totalTaskCount',(select count(*) from public.tasks where user_id=auth.uid()),
    'activeNow',(select count(*) from public.tasks where user_id=auth.uid() and status<>'done'),
    'overdueNow',(select count(*) from public.tasks where user_id=auth.uid() and status<>'done' and due_date<p_today),
    'legacyUndatedCompletionCount',(select count(*) from public.tasks where user_id=auth.uid() and status='done' and completed_at is null),
    'completedCount',(select count(*) from completions),
    'completedSessionCount',(select count(*) from sessions),
    'focusTimeSeconds',coalesce((select sum(duration) from sessions),0),
    'taskDays',coalesce((select jsonb_agg(jsonb_build_object('dateISO',day,'value',value) order by day) from task_days),'[]'::jsonb),
    'focusDays',coalesce((select jsonb_agg(jsonb_build_object('dateISO',day,'value',value) order by day) from focus_days),'[]'::jsonb)
  ) into report;
  return report;
end;
$$;

create function public.focus_summary(p_start timestamptz,p_end timestamptz)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('count',count(*),'seconds',coalesce(sum(duration),0))
  from public.pomodoro_sessions where user_id=auth.uid() and completed
    and ended_at >= p_start and ended_at < p_end;
$$;

create function public.semester_task_counts(p_semester uuid)
returns table(subject_id uuid,active_count bigint)
language sql stable security invoker set search_path = '' as $$
  select t.subject_id,count(*) from public.tasks t
  join public.subjects s on s.id=t.subject_id and s.user_id=auth.uid()
  join public.semesters sem on sem.id=s.semester_id and sem.user_id=auth.uid()
  where t.user_id=auth.uid() and t.status<>'done' and sem.id=p_semester
  group by t.subject_id;
$$;

revoke all on function public.activity_report(date,text,text),public.focus_summary(timestamptz,timestamptz),public.semester_task_counts(uuid) from public,anon;
grant execute on function public.activity_report(date,text,text),public.focus_summary(timestamptz,timestamptz),public.semester_task_counts(uuid) to authenticated;
notify pgrst,'reload schema';
