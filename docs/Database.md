# AKADEX Database Design

## Database Engine

PostgreSQL on Supabase.

## Auth Model

Supabase Auth handles users.
App data lives in public tables with Row Level Security.

---

## Core Tables

### profiles

Stores extra user information linked to `auth.users`.

Fields:

* id
* full_name
* avatar_url
* created_at
* updated_at

### semesters

Stores each academic term a student creates.

Fields:

* id
* user_id
* title
* school_year
* created_at
* updated_at

### subjects

Stores the student's subjects for each semester.

Fields:

* id
* user_id
* semester_id
* subject_code
* subject_name
* units
* grade
* created_at
* updated_at

### tasks

Stores academic tasks and to-dos. Each row is a single dated (or undated)
occurrence — recurring tasks are represented by many `tasks` rows sharing one
`series_id`, not by mutating a single row's due date.

Fields:

* id
* user_id
* subject_id
* series_id
* title
* description
* tags
* due_date
* priority
* status
* created_at
* updated_at

Priority values:

* low
* medium
* high
* urgent

Tags are stored as a text array and entered as comma-separated values in the UI.

Status values:

* todo
* in_progress
* done

`series_id` references `task_series` and is set to null if the series is
removed — the occurrence keeps its own history either way.

A unique index on `(series_id, due_date)` prevents generating the same
occurrence twice for a given series.

### task_series

Stores the recurrence "template" for a recurring task. Individual dated
occurrences are generated into `tasks` and linked back via `tasks.series_id`;
completing or deleting one occurrence never touches the series or other
occurrences.

Fields:

* id
* user_id
* subject_id
* title
* description
* tags
* priority
* recurrence_type
* start_date
* last_generated_through
* active
* created_at
* updated_at

Recurrence type values:

* daily
* weekdays
* weekly
* monthly

`last_generated_through` is a generation checkpoint: occurrences are only
ever generated for dates after this value, on a bounded rolling horizon (see
`src/lib/recurrence.ts`), so deleting a materialized occurrence never causes
it to reappear on the next planner load.

`active` defaults to `true`. The generator only produces new occurrences for
series where `active = true`; setting it to `false` stops future generation
without touching any existing occurrence rows. No pause/resume UI exists yet
— this is data-model groundwork only.

### pomodoro_sessions

Stores study session history.

Fields:

* id
* user_id
* duration
* completed
* started_at
* ended_at
* created_at
* updated_at

---

## Relationship Summary

* One user has many semesters.
* One user has many subjects.
* One user has many tasks.
* One user has many pomodoro sessions.
* One semester has many subjects.
* One subject can have many tasks.
* One task series has many task occurrences.

---

## Security Rules

* Every user-owned table uses `user_id = auth.uid()` in RLS.
* `profiles.id` must match the authenticated user.
* Foreign keys cascade or null out safely when a parent row is removed.
* Timestamps update automatically with a trigger.

---

## Next Step

Run [supabase/schema.sql](C:\Users\user\Documents\GitHub\acadex\supabase\schema.sql) in the Supabase SQL editor, then we can move on to authentication and protected routes.
