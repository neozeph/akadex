# Spec 04: account calendar timezone

Status: implemented and verified locally.

Plan/ledger: [timezone plan](../../superpowers/plans/2026-11-21-user-timezone.md). Native inline execution followed the feature workflow, TDD, and Ponytail. Changes remain unstaged and uncommitted.

## Decisions and implementation

- Existing and new accounts initially use `Asia/Manila`. Settings accepts an IANA name, validates it on the server, and exposes pending, error, and success states. Profile ownership comes from authenticated identity, never submitted IDs.
- Dashboard, Pomodoro, analytics, planner today/overdue labels, subject task labels, and rolling recurrence use the account calendar. Focus reporting uses `ended_at` and half-open ranges `[start, next day)`. Recent-session labels also use the saved timezone.
- Calendar boundaries use native Intl and a bounded search for the first instant of a civil date, covering DST transitions at midnight. Date-only deadlines and calendar-picker values are preserved. No dependency was added.
- Profile timezone reads are cached per server render. Pomodoro reuses its existing profile query rather than fetching the same profile twice.
- An additive, rerunnable migration adds the defaulted timezone column. Canonical schema is aligned. `npm run e2e:db` applies this specific rerunnable migration locally. General migration tracking remains spec 10.

## Evidence

- Observed RED: five calendar-helper cases, a dashboard completion-range assertion, an analytics account-date assertion with server TZ set to UTC, and a duplicate Pomodoro profile-read assertion. Each passed after implementation.
- Unit coverage pins Manila's 2026-11-20 midnight to 2026-11-19 16:00 UTC, New York's 23/25-hour DST days, Santiago's midnight DST jump, invalid input, and missing/failed profile reads.
- Three dedicated real-browser stories passed: saved settings/reload/invalid input/foreign-ID rejection; independently SQL-derived Manila boundaries across four views with a Los Angeles browser; and historical New York fall-back fixtures in monthly reporting with a Tokyo browser. PostgreSQL independently confirms the 23/25-hour durations. Exact historical day lengths are checked by the shared helper tests; the browser does not alter the server clock.
- UTC-boundary mutation caused four unit failures and browser S2 to show seven focus minutes instead of five. Source restored in `finally`; no mutation retained.
- Initial browser failures were selector ambiguity (Next's route-announcer alert and hidden duplicate route content). Selectors now target the form or visible content.
- Final unit suite: 150 passed across 20 files. Lint, typecheck, and production build passed. Full restored-source `npm run e2e:test`: all 12 functional browser scenarios passed in 1.7 minutes, including previous specs.
- Captured sanitized fixture: [timezone sessions](fixtures/04-timezone-sessions.json), selected from the real S2 database records after their values were verified through the app. Contains only duration, completion flag, and timestamps.
- One fresh independent reviewer completed complexity, correctness, and security passes with no actionable findings.
- Cleanup verified: zero sessions, tasks, or semesters remain; account timezone preferences are restored, session INSERT privilege is present, and no app listener remains on port 3100. Git's index is empty and HEAD remains `edb93c0`.

## Delivery

Apply [the migration](../../../supabase/migrations/20261121000000_profile_timezone.sql) to the intended deployment database before deploying these application changes. Only the isolated local database was changed here. No hosted migration, deployment, staging, or commit was performed.

This slice establishes calendar correctness, not a new latency benchmark. Query pagination and reporting optimizations remain in their separate specs.
