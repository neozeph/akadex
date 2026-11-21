-- AKADEX core schema for Supabase Postgres
-- Paste this into the Supabase SQL editor and run it once.

create extension if not exists "pgcrypto";

do $$
begin
  create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.task_status as enum ('todo', 'in_progress', 'done');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.task_recurrence_type as enum ('daily', 'weekdays', 'weekly', 'monthly');
exception
  when duplicate_object then null;
end
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep existing installations aligned with the additive migration.
alter table public.profiles
add column if not exists timezone text not null default 'Asia/Manila';

create table if not exists public.semesters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Legacy free-text fields (Sprint 3.6 deprecated these in favor of the
  -- structured columns below). Kept nullable so pre-3.6 rows are unaffected
  -- and new rows can omit them entirely.
  title text,
  school_year text,
  -- Structured semester model (Sprint 3.6).
  year_level integer check (year_level is null or year_level between 1 and 6),
  term text check (term is null or term in ('1', '2', 'summer')),
  school_year_start integer check (
    school_year_start is null or school_year_start between 2000 and 2100
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  semester_id uuid references public.semesters (id) on delete cascade,
  subject_code text not null,
  subject_name text not null,
  units numeric(4,1) not null check (units > 0),
  grade numeric(5,2) check (
    grade is null
    or grade in (1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50, 2.75, 3.00, 5.00)
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete set null,
  title text not null,
  description text,
  tags text[] not null default '{}'::text[],
  due_date date,
  priority public.task_priority not null default 'medium',
  status public.task_status not null default 'todo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks
add column if not exists tags text[] not null default '{}'::text[];

-- Sprint 7.2: trustworthy completion timestamp for Task Analytics.
-- `updated_at` cannot serve this purpose — it also changes on title/
-- priority/due-date/subject edits, not just completions — so completion
-- trends need their own column. Nullable and additive: every existing row
-- (including existing status = 'done' rows) gets completed_at = null, since
-- we have no trustworthy historical record of when those actually
-- completed. Analytics treats those as "legacy undated completions" rather
-- than guessing a date from updated_at.
alter table public.tasks
add column if not exists completed_at timestamptz;

-- Sprint 4: recurring task series. A series is the recurrence "template";
-- individual dated tasks (occurrences) are ordinary rows in public.tasks
-- linked back via series_id, so each occurrence keeps its own independent
-- status/completion history.
create table if not exists public.task_series (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete set null,
  title text not null,
  description text,
  tags text[] not null default '{}'::text[],
  priority public.task_priority not null default 'medium',
  recurrence_type public.task_recurrence_type not null,
  start_date date not null,
  -- Generation checkpoint: occurrences are only ever generated for dates
  -- after this value, so deleting a materialized occurrence never causes it
  -- to be silently regenerated on the next planner load.
  last_generated_through date,
  -- Sprint 4.1: lets the generator be told to stop producing new occurrences
  -- for a series without deleting its history. No pause/resume UI ships this
  -- sprint — this only makes the data model and generator ready for it.
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks
add column if not exists series_id uuid references public.task_series (id) on delete set null;

-- Sprint 4.1: idempotent patch for task_series created before the "active"
-- column existed. Backfills every pre-existing series to active = true (the
-- same behavior they always had) rather than a destructive migration.
alter table public.task_series
add column if not exists active boolean not null default true;

-- Plain (non-partial) unique index: ON CONFLICT target inference cannot use a
-- partial index unless the INSERT's ON CONFLICT clause repeats the WHERE
-- predicate, which supabase-js's upsert(..., { onConflict }) cannot express.
-- Postgres already treats NULL <> NULL in unique indexes, so ordinary
-- non-recurring tasks (series_id is null) sharing a due_date never collide.
-- Rolling recurring tasks keep exactly one active task row per series. Done
-- rows are completion history and may share a due_date with the active row
-- in a later cycle, so the safeguard applies only to unfinished rows.
drop index if exists public.tasks_series_due_date_unique;

create unique index if not exists tasks_one_active_recurring_task_per_series
  on public.tasks (series_id)
  where series_id is not null
    and status <> 'done';

-- Sprint 3.2: a subject belongs to exactly one semester. Cascade-delete
-- subjects when their semester is removed instead of orphaning them via
-- "on delete set null" (existing rows with semester_id already null are
-- untouched by this — see the audit note before running any cleanup).
alter table public.subjects
drop constraint if exists subjects_semester_id_fkey;

alter table public.subjects
add constraint subjects_semester_id_fkey
foreign key (semester_id) references public.semesters (id) on delete cascade;

-- Sprint 3.2: enforce the grading scale from src/lib/grades.ts GRADE_OPTIONS
-- at the database layer, not only in the server actions.
alter table public.subjects
drop constraint if exists subjects_grade_check;

alter table public.subjects
add constraint subjects_grade_check
check (
  grade is null
  or grade in (1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50, 2.75, 3.00, 5.00)
);

-- Sprint 3.6: structured semester model (additive, non-destructive).
-- Existing free-text title/school_year rows are NOT auto-converted —
-- arbitrary text like "1st Sem" / "First Semester" / "Semester 1" cannot be
-- parsed into year_level/term deterministically without guessing, so this
-- migration only adds the new nullable columns and relaxes the legacy ones
-- to nullable. Legacy rows keep their title/school_year untouched until a
-- user edits them through the app, at which point updateSemester now
-- writes only the structured fields and clears the legacy ones.
alter table public.semesters
alter column title drop not null;

alter table public.semesters
alter column school_year drop not null;

alter table public.semesters
add column if not exists year_level integer;

alter table public.semesters
add column if not exists term text;

alter table public.semesters
add column if not exists school_year_start integer;

alter table public.semesters
drop constraint if exists semesters_year_level_check;

alter table public.semesters
add constraint semesters_year_level_check
check (year_level is null or year_level between 1 and 6);

alter table public.semesters
drop constraint if exists semesters_term_check;

alter table public.semesters
add constraint semesters_term_check
check (term is null or term in ('1', '2', 'summer'));

alter table public.semesters
drop constraint if exists semesters_school_year_start_check;

alter table public.semesters
add constraint semesters_school_year_start_check
check (school_year_start is null or school_year_start between 2000 and 2100);

create table if not exists public.pomodoro_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  duration integer not null check (duration > 0),
  completed boolean not null default false,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sprint 7 hotfix: server-side idempotency for session logging. The client
-- generates one stable id per logical timer run and sends it on completion;
-- a repeated completion request for the same (user_id, completion_id) must
-- insert at most one row (see logPomodoroSession's upsert with
-- ignoreDuplicates).
alter table public.pomodoro_sessions
add column if not exists completion_id uuid;

-- Hotfix 7.2.1: plain (non-partial) unique index — the same fix already
-- applied to tasks_series_due_date_unique for the identical reason.
-- ON CONFLICT target inference cannot match a partial index unless the
-- upsert's ON CONFLICT clause repeats the index's WHERE predicate, which
-- supabase-js's upsert(..., { onConflict }) cannot express, so the original
-- "where completion_id is not null" partial index silently could not be
-- targeted by logPomodoroSession's onConflict: "user_id,completion_id".
-- Standard Postgres unique-index semantics already treat every NULL as
-- distinct from every other NULL, so a plain index still allows unlimited
-- historical/legacy rows with completion_id = null while still enforcing
-- uniqueness on real (user_id, completion_id) pairs — no partial predicate
-- needed. Dropped and recreated without "if not exists" (rather than
-- relying on "create ... if not exists", which would silently no-op and
-- leave a previously-created partial index in place) so this migration
-- self-heals an environment where the old partial index already exists.
drop index if exists public.pomodoro_sessions_user_completion_id_key;

create unique index pomodoro_sessions_user_completion_id_key
on public.pomodoro_sessions (user_id, completion_id);

-- Sprint 6: per-user customizable Pomodoro durations, stored on the
-- existing profiles row rather than a new preferences table. Defaults match
-- the app's previous hardcoded 25/5 cycle, so every existing user keeps
-- behaving exactly as before until they explicitly change it. pomodoro_sessions
-- itself is untouched — this only affects future sessions' configured length,
-- never past rows.
alter table public.profiles
add column if not exists focus_duration_minutes integer not null default 25;

alter table public.profiles
add column if not exists break_duration_minutes integer not null default 5;

alter table public.profiles
drop constraint if exists profiles_focus_duration_minutes_check;

alter table public.profiles
add constraint profiles_focus_duration_minutes_check
check (focus_duration_minutes between 1 and 120);

alter table public.profiles
drop constraint if exists profiles_break_duration_minutes_check;

alter table public.profiles
add constraint profiles_break_duration_minutes_check
check (break_duration_minutes between 1 and 120);

create index if not exists semesters_user_id_idx on public.semesters (user_id);
create index if not exists subjects_user_id_idx on public.subjects (user_id);
create index if not exists subjects_semester_id_idx on public.subjects (semester_id);
create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists tasks_subject_id_idx on public.tasks (subject_id);
create index if not exists tasks_due_date_idx on public.tasks (due_date);
create index if not exists tasks_series_id_idx on public.tasks (series_id);
create index if not exists task_series_user_id_idx on public.task_series (user_id);
create index if not exists pomodoro_sessions_user_id_idx on public.pomodoro_sessions (user_id);

-- Sprint 9.2: analytics/dashboard performance. tasks.completed_at is
-- range-filtered on every analytics load; pomodoro_sessions is queried by
-- user_id + completed = true + an ended_at range on every analytics/
-- dashboard/pomodoro-page load, so a single composite index matching that
-- exact predicate shape (equality columns first, range column last) serves
-- all three call sites in one index rather than three separate ones.
create index if not exists tasks_completed_at_idx on public.tasks (completed_at);
create index if not exists pomodoro_sessions_user_completed_ended_at_idx
  on public.pomodoro_sessions (user_id, completed, ended_at);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_semesters_updated_at on public.semesters;
create trigger set_semesters_updated_at
before update on public.semesters
for each row execute function public.set_updated_at();

drop trigger if exists set_subjects_updated_at on public.subjects;
create trigger set_subjects_updated_at
before update on public.subjects
for each row execute function public.set_updated_at();

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

drop trigger if exists set_task_series_updated_at on public.task_series;
create trigger set_task_series_updated_at
before update on public.task_series
for each row execute function public.set_updated_at();

drop trigger if exists set_pomodoro_sessions_updated_at on public.pomodoro_sessions;
create trigger set_pomodoro_sessions_updated_at
before update on public.pomodoro_sessions
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.semesters enable row level security;
alter table public.subjects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_series enable row level security;
alter table public.pomodoro_sessions enable row level security;

drop policy if exists "Profiles are readable by owner" on public.profiles;
create policy "Profiles are readable by owner"
on public.profiles
for select
using (id = auth.uid());

drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner"
on public.profiles
for insert
with check (id = auth.uid());

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Users can manage their semesters" on public.semesters;
create policy "Users can manage their semesters"
on public.semesters
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can manage their subjects" on public.subjects;
create policy "Users can manage their subjects"
on public.subjects
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can manage their tasks" on public.tasks;
create policy "Users can manage their tasks"
on public.tasks
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can manage their task series" on public.task_series;
create policy "Users can manage their task series"
on public.task_series
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can manage their pomodoro sessions" on public.pomodoro_sessions;
create policy "Users can manage their pomodoro sessions"
on public.pomodoro_sessions
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Spec 05: atomic recurring completion history (fresh-schema reference).
create table if not exists public.task_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  series_id uuid references public.task_series(id) on delete set null,
  occurrence_date date not null,
  completed_at timestamptz not null default now(),
  unique (task_id, occurrence_date)
);
create index if not exists task_completions_owner_time on public.task_completions(user_id, completed_at);
alter table public.task_completions enable row level security;
revoke all on public.task_completions from public, anon, authenticated;
grant select on public.task_completions to authenticated;
drop policy if exists "Owners read completion history" on public.task_completions;
create policy "Owners read completion history" on public.task_completions
  for select to authenticated using (user_id = auth.uid());

create or replace function public.complete_recurring_task(p_task_id uuid, p_occurrence_date date)
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

create or replace function public.guard_recurring_task_edits()
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
drop trigger if exists guard_recurring_task_edits on public.tasks;
create trigger guard_recurring_task_edits before insert or update on public.tasks
  for each row execute function public.guard_recurring_task_edits();
notify pgrst, 'reload schema';

-- SQL arguments are literal data; substring search needs no PostgREST OR grammar.
-- Invoker rights and the ownership predicate retain task/relationship RLS.
create or replace function public.search_tasks(
  p_search text default '',
  p_status public.task_status default null,
  p_subject uuid default null,
  p_priority public.task_priority default null
) returns setof public.tasks
language sql stable security invoker
as $$
  select t.* from public.tasks t
  where t.user_id = auth.uid()
    and ((p_status is null and t.status <> 'done') or t.status = p_status)
    and (p_subject is null or t.subject_id = p_subject)
    and (p_priority is null or t.priority = p_priority)
    and pg_catalog.char_length(coalesce(p_search, '')) <= 200
    and (
      coalesce(pg_catalog.btrim(p_search), '') = ''
      or pg_catalog.strpos(pg_catalog.lower(t.title), pg_catalog.lower(pg_catalog.btrim(p_search))) > 0
      or pg_catalog.strpos(pg_catalog.lower(coalesce(t.description, '')), pg_catalog.lower(pg_catalog.btrim(p_search))) > 0
      or exists (
        select 1 from pg_catalog.unnest(t.tags) as tag
        where pg_catalog.strpos(pg_catalog.lower(tag), pg_catalog.lower(pg_catalog.btrim(p_search))) > 0
      )
    );
$$;
revoke all on function public.search_tasks(text,public.task_status,uuid,public.task_priority) from public, anon;
grant execute on function public.search_tasks(text,public.task_status,uuid,public.task_priority) to authenticated;
notify pgrst, 'reload schema';
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
-- Refuse incompatible legacy data instead of silently rewriting ownership.
do $$ begin
  if exists(select 1 from public.subjects s join public.semesters p on p.id=s.semester_id where s.user_id<>p.user_id)
    or exists(select 1 from public.tasks t join public.subjects s on s.id=t.subject_id where t.user_id<>s.user_id)
    or exists(select 1 from public.task_series t join public.subjects s on s.id=t.subject_id where t.user_id<>s.user_id)
  then raise exception 'Existing cross-account parent links require manual review' using errcode='23514'; end if;
end $$;

create unique index semesters_owner_id_key on public.semesters(user_id,id);
create unique index subjects_owner_id_key on public.subjects(user_id,id);

alter table public.subjects add constraint subjects_owned_semester_fk
  foreign key(user_id,semester_id) references public.semesters(user_id,id) on delete cascade;
alter table public.tasks add constraint tasks_owned_subject_fk
  foreign key(user_id,subject_id) references public.subjects(user_id,id) on delete set null(subject_id);
alter table public.task_series add constraint task_series_owned_subject_fk
  foreign key(user_id,subject_id) references public.subjects(user_id,id) on delete set null(subject_id);

-- Replace old single-column constraints only after the stricter ones validate.
alter table public.subjects drop constraint subjects_semester_id_fkey;
alter table public.tasks drop constraint tasks_subject_id_fkey;
alter table public.task_series drop constraint task_series_subject_id_fkey;
notify pgrst,'reload schema';
