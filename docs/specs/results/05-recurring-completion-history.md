# Spec 05: atomic recurrence and completion history

Status: implemented and verified locally.

Plan and execution ledger: [implementation plan](../../superpowers/plans/2026-11-21-recurring-completion-history.md). Used feature workflow, inline Superpowers execution, TDD, Ponytail, and one independent reviewer. No dependencies added. Changes remain unstaged and uncommitted.

## Contracts and decisions

- Occurrences are unique by task ID and displayed due date. The authenticated RPC locks task and series, uses server time and the account timezone, advances beyond both today and the occurrence, and inserts one event in the same transaction. Stale retries do nothing.
- Completion events are readable only by their owner and cannot be directly inserted, changed, or deleted by authenticated clients. Task/series deletion preserves events with nullable references; account deletion removes account-owned history.
- Recurring history has no undo UI. The editor explains that the checkbox saves completion and advances the task. It rejects Done edits, stale occurrence snapshots, and restoring completed dates. A database guard also rejects direct Done transitions and detachment/relinking of an active occurrence. Nonrecurring completion/undo retains its existing behavior.
- Analytics combines new events with existing completed task rows, deduplicates matching occurrences, preserves undated-history warnings, and invents no old recurring events. New history reads use 500-row keyset pages, preventing the service row limit from capping totals or offset shifts from double-counting.

## Migration prerequisite from spec 10

- Captured the pre-spec05 public schema fingerprint and froze its baseline SQL. Explicit local adoption verified that fingerprint and registered baseline/timezone versions without replaying DDL or rows.
- Native Supabase migration tracking now applies pending versions. Canonical schema seeding is disabled. Unknown baseline adoption is refused; a repeated migration run preserves the ledger.
- Fresh provisioning and a representative upgrade ran in two disposable local databases with the real auth schema. Existing completed-task data survived, and no historical events were fabricated. Both databases were removed.
- Only this migration checkpoint is complete. Spec 10's broader isolation matrix and CI/authentication work remain pending. See [migration instructions](../../../supabase/MIGRATIONS.md).

## Verification evidence

- Observed RED before the RPC existed. Database checks now pass daily, weekly, weekday, month-end, future completion, replay, forced rollback, grants/RLS, direct-update rejection, history retention, fresh/upgrade provisioning, and ledger safety.
- Analytics regression first missed a real captured event, then passed. Review regressions observed 500 instead of 1,001 events and 1,002 instead of 1,001 after a concurrent boundary insert; keyset paging returned GREEN.
- Independent review found stale edit, truncation, and direct-update bypasses. Follow-up review found detachment and offset-pagination variants. All were fixed and covered; final focused review reported no remaining actionable findings.
- Three focused browser stories passed: daily/weekly/monthly/weekday progression and analytics; simultaneous tabs/replay/stale editor; rollback plus two-account separation and existing nonrecurring counts.
- Mutation removed the event insert only in the isolated RPC. Database verification failed and browser S1 saw zero events instead of one. The original function was restored in `finally`; no mutation remains.
- Captured sanitized real event: [completion fixture](fixtures/05-completion-event.json). It contains only occurrence date and server completion timestamp; IDs and account information were removed.
- Final unit suite: 153 tests passed across 20 files. Lint, typecheck, production build, and `npm run e2e:verify-db` passed. The final restored-code full browser suite passed all 15 scenarios in 2.0 minutes, including prior specs.
- Cleanup verified: zero tasks, series, events, sessions, semesters, or scratch databases; no injected failure trigger or port-3100 listener remains. Session INSERT privilege is restored. Git's index is empty and HEAD remains `edb93c0`.

## Delivery limits

No hosted database, deployment, staging, or commit was performed. Establish the hosted baseline deliberately and apply pending migrations before deploying the application. Existing broader reporting/query optimizations remain in specs 06/08; this slice specifically prevents new completion history from truncating.
