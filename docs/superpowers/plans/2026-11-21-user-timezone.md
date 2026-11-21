# User Timezone Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task. Leave all changes unstaged and uncommitted.

**Goal:** Make calendar boundaries agree across Settings, tasks, dashboard, Pomodoro, and analytics.

**Architecture:** Store an explicit IANA timezone on the authenticated profile. Use native Intl for instant-to-calendar conversion and shared day-boundary helpers. Preserve date-only task values and existing UI date-picker behavior.

**Tech Stack:** Installed Next.js 16.2.7, Supabase PostgreSQL, TypeScript, Intl, Vitest, Playwright.

**Spec:** `docs/specs/04-user-timezone.md`.

## Decisions and cut gate

- Default existing and new accounts to `Asia/Manila`, as proposed in the spec.
- Focus reporting uses completion time (`ended_at`), with half-open ranges `[start, next day)` everywhere.
- No date library, general localization framework, reminder scheduling, or production migration execution.
- Reuse existing profile ownership policies and form primitives. Read installed Next data/security guidance before implementation.

## Review focus

Browser/server timezone mismatch, DST short/long days, invalid input, missing profiles, and profile ownership each need a regression.

## Task 1: timezone setting and calendar primitives

Files: `src/lib/dates.ts`, `src/lib/dates.test.ts`, `supabase/schema.sql`, a new additive migration under `supabase/migrations/`, `src/app/(dashboard)/settings/{actions,data,page}.tsx` (use existing `.ts` extensions for actions/data), and an existing-style client form if necessary.

- [x] Write failing tests for `isValidTimeZone(value)`, `toDateInTimeZone(instant, zone)`, and `getDayBoundsInTimeZone(dateISO, zone)` returning UTC ISO start/end instants.
- [x] Pin Manila midnight to `2026-11-19T16:00:00Z`, New York 2026-03-08 to a 23-hour day, and 2026-11-01 to a 25-hour day. Reject invalid zone input without mutating the profile.
- [x] Add a rerunnable additive timezone column migration with the explicit default. Apply only to isolated local Supabase. Keep canonical schema aligned.
- [x] Implement authenticated settings read/write and accessible pending/error/success states. Missing profiles use the documented default.
- [x] Verify persisted settings and cross-account ownership through the real local service.

## Task 2: apply the account calendar consistently

Files: dashboard/Pomodoro loaders, `src/app/(dashboard)/analytics/activity-data.ts`, task loader/actions and planner consumers found by tracing `toISODate(new Date())`, plus their existing tests and `e2e/timezone.spec.ts`.

- [x] Add failing boundary tests before changing each consumer. Pass the authenticated timezone and explicit today value to client consumers rather than using browser-local today.
- [x] Use shared boundaries for focus queries and completion-date buckets. Preserve date-only deadlines, recurrence dates, and date-picker formatting.
- [x] Real E2E: settings persist after reload, Manila midnight totals match across views, browser/server mismatch, DST fixtures, and invalid settings leave the saved zone intact. Restore account preferences and delete only test-owned records in `finally`.
- [x] Mutation: replace account boundaries with server-local midnight and observe unit and real-browser failure, then restore.
- [x] Run unit tests, lint, typecheck, production build, and functional E2E. Review complexity, correctness, migration safety, and ownership. Record evidence in `docs/specs/results/04-user-timezone.md`.

Execution complete locally. Evidence: docs/specs/results/04-user-timezone.md. All changes are unstaged and uncommitted.
