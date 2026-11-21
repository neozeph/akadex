# 05: Atomic recurrence and completion history

Goal: completing a recurring task records progress and advances its occurrence exactly once.

Touchpoints: `supabase/schema.sql`, a versioned migration, `src/app/(dashboard)/tasks/actions.ts`, recurrence helpers, and analytics activity loading. Requires migration setup from spec 10 and timezone contract from spec 04.

## Stories and acceptance

1. Completing an active recurring task records one completion event and advances its next due date in one transaction. The next occurrence remains active and completion analytics increases once.
2. Double clicks, concurrent tabs, and replay of the same occurrence produce one event and one advance. Completion of a future occurrence must advance beyond that occurrence, not return the same date.
3. A student cannot read or write another account's events. Transaction failure leaves both task and history unchanged. Existing nonrecurring completions are counted once, with no invented historical recurring events.

## Plan and tests

- Decide an occurrence identity and uniqueness rule before schema changes. Keep the current one-active-task-per-series behavior. Define undo semantics explicitly without silently deleting history.
- Add failing action/database regressions, then implement a narrow transaction/RPC with authenticated ownership. Avoid trusting client user IDs or timestamps for authorization.
- Real E2E: daily/weekly/monthly rollover, future completion, simultaneous requests, forced rollback, analytics visibility, and two-account access. Hand-derive dates and counts.
- Mutation: omit event insertion or transaction protection and demonstrate failure. Verify RPC privileges, RLS, and migration compatibility.

Exit: atomic behavior, event visibility, and recurrence analytics verified. No reconstruction of unknowable historical events.
