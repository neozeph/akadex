# Spec 06: database filters and bounded task pages

Status: implemented and verified locally.

Plan/ledger: [bounded query plan](../../superpowers/plans/2026-11-21-bounded-task-queries.md). Used the feature workflow, inline Superpowers execution, TDD, Ponytail, and one independent reviewer. All changes remain unstaged and uncommitted.

## What changed

The planner previously fetched task history and then filtered it in JavaScript, exposing it to the API's 1,000-row cap. A read-only SQL function now combines status, subject, and priority with literal title/description/tag substring search before returning a page. It uses invoker permissions, task RLS, and authenticated ownership; anonymous execution is denied.

Pages show 50 tasks and fetch at most 51 for lookahead, ordered by due date/nulls last, creation time descending, and ID ascending. First/previous/next links preserve filters; filter changes reset the page. Labels and date-column counts describe the visible window, not an account-wide total. Past-last pages offer recovery links. Concurrent edits can move tasks between offset pages; reloading reflects current state.

Invalid/repeated query values are ignored with an explanation. Search is limited to 200 characters. RPC arguments preserve literal punctuation and Unicode without constructing PostgREST OR syntax. Filter inputs track URL back/forward changes, pending searches show feedback, and failed reads have a generic keyboard-accessible retry boundary. Existing login redirects and date grouping remain intact. No React Query migration, dependency, or speculative index was added.

## Evidence

- Captured the existing combined filter behavior on real isolated records before changing the loader. Final [sanitized API rows](fixtures/06-task-query-rows.json) cover title, description, tags, statuses, priorities, and subject relationships.
- Observed RED for the missing query boundary and optional GET-RPC arguments incorrectly serialized as the string `null`. Correct omission of optional arguments returned GREEN.
- Dedicated browser stories passed combined/cleared filters, literal wildcard/quote/backslash/Unicode search, URL back/forward, stable page ties, a null due date and a match beyond 1,000 rows, past-last recovery, filter page reset, slow search, permission failure/retry, invalid URLs, another account, anonymous access, and expired cookies.
- Mutation removed the client range: the request-boundary unit assertion failed. Removing the SQL status predicate made real-browser S1 return an extra Done task. Both mutations were restored immediately.
- One browser assertion initially matched hidden duplicate Next route content; it now targets visible content. The SDK's ambiguous RPC test type was narrowed with `Array.isArray`; application query rows have an explicit shape.
- Independent complexity/correctness/security review reported no actionable findings.
- Final unit suite: 160 passing tests across 21 files. Lint, typecheck, production build, and fresh/upgrade migration verification passed. The full restored-code browser suite passed all 18 functional scenarios in 1.7 minutes, including prior specs.
- Cleanup verified: zero tasks, series, events, sessions, semesters, or scratch databases. Task SELECT permission and the SQL status predicate are restored. No test-server listener remains. Git's index is empty and HEAD remains `edb93c0`.

## Payload comparison and migration

On 2,206 real local fixture tasks (1,103 active and 1,103 completed), identical projections returned 1,000 rows / 273,001 serialized JSON bytes through the old read and 51 rows / 13,924 bytes through the bounded read. Fifty are displayed. See [measurement](06-query-payload.json). This measures uncompressed serialized response data, not HTTP compression or deployment latency. Spec 01 used eight tasks; its latency baseline was not rerun or treated as directly comparable to this larger dataset.

The search migration was applied locally only. Fresh/upgrade migration verification now checks its invoker rights and execution grants. Follow [migration instructions](../../../supabase/MIGRATIONS.md) before any hosted deployment. No deployment or hosted database change occurred.
