-- AKADEKS core schema for Supabase Postgres
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

create index if not exists semesters_user_id_idx on public.semesters (user_id);
create index if not exists subjects_user_id_idx on public.subjects (user_id);
create index if not exists subjects_semester_id_idx on public.subjects (semester_id);
create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists tasks_subject_id_idx on public.tasks (subject_id);
create index if not exists tasks_due_date_idx on public.tasks (due_date);
create index if not exists pomodoro_sessions_user_id_idx on public.pomodoro_sessions (user_id);

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

drop trigger if exists set_pomodoro_sessions_updated_at on public.pomodoro_sessions;
create trigger set_pomodoro_sessions_updated_at
before update on public.pomodoro_sessions
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.semesters enable row level security;
alter table public.subjects enable row level security;
alter table public.tasks enable row level security;
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
