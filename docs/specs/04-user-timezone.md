# 04: Consistent user calendar boundaries

Goal: use one explicit user timezone for today, overdue status, recurrence, and daily reports.

Touchpoints: `src/lib/dates.ts`, profile schema/settings, dashboard/task/Pomodoro loaders, recurrence actions, and analytics activity helpers.

## Stories and acceptance

1. A student selects a valid IANA timezone in Settings. Existing accounts receive a documented initial default, proposed `Asia/Manila`, rather than the execution server's timezone. Date-only due dates remain unchanged.
2. In `Asia/Manila`, 2026-11-19T16:00:00Z starts November 20. Dashboard, planner, focus totals, and analytics agree on both sides of that boundary.
3. An account using a DST-observing timezone gets correct calendar-day boundaries on short and long days. Invalid timezone input is rejected safely.

## Plan and tests

- Resolve the default in the slice plan. Add failing boundary tests with hand-derived UTC expectations, then centralize only the date conversions actually shared by these routes.
- Use half-open timestamp ranges [start, next day). Define whether focus reports use completion time consistently across dashboard, Pomodoro, and analytics.
- Real E2E: persisted timezone, midnight records, browser/server timezone mismatch, DST boundary, and invalid setting submission.
- Mutation: replace timezone-aware boundaries with server-local midnight and confirm failure. Review migration and profile ownership.

Exit: boundaries and settings persist correctly. No reminder scheduler or general localization work.
