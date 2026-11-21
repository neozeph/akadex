# Atomic Recurring Completion Implementation Plan

> Use superpowers:executing-plans with TDD and one final independent review. Leave all changes unstaged and uncommitted.

**Goal:** Record recurring progress and advance exactly once in a database transaction.
**Architecture:** Supabase migrations establish an explicit baseline. A narrowly authorized RPC locks the task/series, records an occurrence event, and advances the existing active row. Analytics combines those events with existing task completions without reconstructing history.
**Tech stack:** Installed Next.js 16.2.7, PostgreSQL/Supabase, TypeScript, Vitest, Playwright. No new dependency.
**Spec:** `docs/specs/05-recurring-completion-history.md`; prerequisite: spec 10 migration checkpoint only.

## Contracts and cut gate

- Occurrence identity: `(task_id, occurrence_date)`, unique. Callers must send the displayed due-date snapshot. Stale snapshots are no-ops.
- Server owns identity and completion timestamp. Next due date is strictly after both the current occurrence and today in the stored account timezone.
- Keep one active task per series. Events are append-only to clients and survive task/series deletion through nullable references. Account deletion removes account-owned history.
- No recurring-history undo ships here. Completing advances to a new active occurrence. Editing its status to Done must use the same atomic completion path; the editor directs recurring completion to the checkbox to avoid mixing schedule edits with completion. Nonrecurring undo keeps its existing behavior.
- Preserve existing done-row completions once; create no historical recurring events. Event/task overlap is deduplicated by task and due date.
- Native migration tracking, explicit adoption of the verified existing local baseline, and no destructive schema replay. No hosted writes, CI auth changes, general event framework, or history browser.

## Review focus

Concurrent retries, future/month-end dates, foreign task/series linkage, forced rollback, and existing done-row analytics must each have a regression.

## Task 1: migration checkpoint

Files: frozen baseline migration, `supabase/config.toml`, baseline fingerprint metadata, `e2e/run.ts`, and migration verification script.

- [x] Pin the pre-spec05 schema baseline and capture its local schema fingerprint without row data.
- [x] Add guarded explicit local adoption and native pending-migration application. Stop on an unknown existing schema. Disable canonical-schema seeding after versioned migrations.
- [x] Verify fresh provisioning and representative upgrade in disposable databases, preserving sample rows. Verify repeat application leaves the ledger unchanged.

## Task 2: transactional completion and reporting

Files: new versioned migration/canonical schema, task actions and edit dialog, analytics activity loader/tests, and `e2e/recurrence.spec.ts`.

- [x] Observe a failing database/RPC regression before adding the function/table.
- [x] Implement `complete_recurring_task(p_task_id uuid, p_occurrence_date date)` with authenticated ownership, locked state, unique history, date rollover, and least-privilege grants/RLS.
- [x] Route recurring checkboxes through the RPC; reject recurring Done edits with actionable UI guidance. Require the occurrence snapshot.
- [x] Add failing analytics coverage, then merge event timestamps with legacy completions exactly once. Preserve account timezone ranges.
- [x] Real E2E: daily/weekly/monthly and future rollover; simultaneous requests/replay; event visibility, foreign access, rollback, and legacy nonrecurring totals. Capture sanitized service payloads.
- [x] Mutation removes event insertion; browser/database assertions must fail. Restore immediately, rerun tests, lint, typecheck, build, full browser suite, and independent complexity/correctness/security review.
- [x] Record evidence and cleanup in `docs/specs/results/05-recurring-completion-history.md` and migration checkpoint results. Update backlog honestly.

Completed locally. Verification and review rulings: docs/specs/results/05-recurring-completion-history.md. No staging or commits.
