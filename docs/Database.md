# ACADEX Database Design

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

Stores academic tasks and to-dos.

Fields:

* id
* user_id
* subject_id
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

---

## Security Rules

* Every user-owned table uses `user_id = auth.uid()` in RLS.
* `profiles.id` must match the authenticated user.
* Foreign keys cascade or null out safely when a parent row is removed.
* Timestamps update automatically with a trigger.

---

## Next Step

Run [supabase/schema.sql](C:\Users\user\Documents\GitHub\acadex\supabase\schema.sql) in the Supabase SQL editor, then we can move on to authentication and protected routes.
