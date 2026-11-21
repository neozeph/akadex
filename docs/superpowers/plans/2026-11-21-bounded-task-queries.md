# Bounded Task Queries Implementation Plan

> Use superpowers:executing-plans with TDD, Ponytail, and one final independent review. Leave all changes unstaged and uncommitted.

**Goal:** Retrieve only a bounded page of matching tasks while preserving planner filters and date grouping.
**Architecture:** A read-only, security-invoker SQL function returns matching task rows using authenticated ownership and literal substring search across title, description, and individual tags. PostgREST applies the existing date/creation sort plus ID tie-breaker and a bounded range. URL state controls page navigation.
**Tech stack:** Installed Next.js 16.2.7, Supabase/PostgreSQL, TypeScript, Vitest, Playwright. No React Query or new dependency.
**Spec:** `docs/specs/06-bounded-task-queries.md`.

## Contracts and cut gate

- Page size: 50 visible tasks, at most 51 fetched (one lookahead). No expensive full matching count is requested. Labels describe only this page/window; column badges are page-local.
- Order: due date ascending/nulls last, creation time descending, ID ascending. Offset pages support shareable `page` URLs. Concurrent mutations may move tasks between pages; a reload reflects current state.
- Active means todo or in_progress; explicit statuses, subject, and priority combine with AND. Title/description/tag substring search combines with OR and ignores case. Punctuation, wildcard characters, backslashes, quotes, and Unicode remain literal search data passed as RPC arguments, never PostgREST filter syntax.
- Accept scalar query values, valid status/priority enums, UUID subjects, and positive safe page numbers. Search is limited to 200 characters. Invalid values are ignored with a visible explanation; pagination resets when filters change. A past-last page offers first/previous navigation rather than pretending the account is empty.
- Keep date groups, keyboard controls, loading/empty/error states, account ownership, and existing mutations. No speculative indexes without a measured query-plan need.

## Review focus

Literal punctuation/tag search; repeated or malformed URL values; stable ties/null due dates; data beyond 1,000 rows; failure/recovery/auth isolation. Test each at its actual boundary.

## Task 1: preserve semantics and define the query boundary

Files: `e2e/task-queries.spec.ts`, `src/lib/task-query.ts` and tests, a new versioned read-function migration/canonical schema.

- [x] Capture existing filter behavior on real local records before implementation.
- [x] Observe RED for validation, bounded range/order, database-side filters, and >1,000-row reachability.
- [x] Implement normalized query values/page links and `search_tasks(p_search,p_status,p_subject,p_priority)` returning `SETOF public.tasks`, with literal array-element search, RLS, and least-privilege execution.
- [x] Apply only to isolated local Supabase. Capture sanitized real query results for regression fixtures.

## Task 2: page the planner and verify

Files: tasks loader/page/search toolbar, route-local error boundary, relevant query tests, and E2E scenarios.

- [x] Remove in-memory history filtering and the unused all-task return. Fetch 51 ordered matches; render 50 and derive Next availability.
- [x] Add accessible first/previous/next URL links and an explicit page/window explanation. Preserve filter reset/back/forward semantics and account-calendar grouping.
- [x] Route read failures to a generic retryable boundary; retain existing loading and login redirect behavior.
- [x] Real E2E: combined and cleared filters, literal/Unicode/tag search, URL history, >1,000 tasks/page ties, empty/past-last pages, slow reads, failure/retry, expired session, and another account.
- [x] Mutation removes a SQL filter or bounded range: actual database/browser regressions must fail. Restore, rerun full checks and one independent correctness/security/complexity review.
- [x] Record rows/payload comparison with the original whole-history read, migration verification, cleanup, and final commands in `docs/specs/results/06-bounded-task-queries.md`.

Completed locally. Evidence: docs/specs/results/06-bounded-task-queries.md. No staging or commits.
