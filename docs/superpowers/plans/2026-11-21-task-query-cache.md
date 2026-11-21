# Task Query Cache Implementation Plan

> Use superpowers:executing-plans, TDD, Ponytail, and one final independent review. Leave changes unstaged and uncommitted.

**Goal:** Reuse fresh task pages and make completion immediate, reversible, and account-safe.
**Architecture:** A 45-second React Query cache lives inside the authenticated layout. Full document requests seed a request-scoped server QueryClient; client navigations and native-history filter changes read through authenticated `/api/tasks`. One shared server query owns database reads. Mutation overlays/snapshots are scoped to individual tasks, never entire pages.
**Tech stack:** Installed Next.js 16.2.7, React Query 5, Supabase, Vitest, Playwright. No dependency or schema change.
**Spec:** `docs/specs/07-task-query-cache.md`.

## Contracts and cut gate

- Keys contain account, normalized filters, and page. Freshness 45 seconds, memory-only retention 5 minutes. Browser clients remain stable for an account; server clients are created per request. No protected cache persistence.
- Standard `Sec-Fetch-Dest` distinguishes document requests (SSR seed) from fetch/RSC navigations (no duplicate task prefetch). Missing metadata safely defaults to SSR. This affects prefetch only; every read/mutation independently authorizes the session.
- Filter/page controls use Next's documented native History integration, retaining shareable URLs, browser history, and modified-click/new-tab behavior.
- The API checks the current account against the expected cache owner, returns private/no-store data, and propagates cancellation. Account mismatch/missing auth clears protected state before redirecting. Auth events and sign-out also clear memory.
- Ordinary completion is optimistic; recurring completion remains visible with a disabled pending checkbox until the authoritative next due date arrives. Duplicate in-flight actions for one task are coalesced. Rollback restores only that task, preserving other successes. Failures show retry.
- Mutations cancel outgoing task reads, reconcile the server's returned ID/status/due date, then invalidate affected task pages after concurrent writes settle. Create/edit/delete retain existing forms and invalidate task reads. Cross-view cache expansion remains spec 09.
- Preserve spec 01's 3/80 completion/restoration failure diagnostics. Reproduce reconciliation failure deterministically with delayed/failed writes, then prove persistence through reload rather than checkbox appearance.

## Review focus

SSR versus client ownership, old-account responses, simultaneous mutations/rollback, filter changes during writes, and recurring duplicate completion each need a regression.

## Task 1: cache and authenticated reads

Files: split pure/server task-query helpers, new task-cache helpers/tests and provider, authenticated layout, tasks loader/page/workspace, API route, toolbar/page links, sign-out button.

- [x] Observe failing hydration/freshness/key-isolation/cancellation tests and browser read counts.
- [x] Implement request-scoped hydration, stable browser ownership, no duplicate RSC task reads, native filter history, API session guards, cancellation, and cache teardown.

## Task 2: optimistic mutations and verification

Files: task actions, task board/column/card, workspace/cache helpers/tests, `e2e/task-cache.spec.ts`.

- [x] Reproduce failed/delayed completion reconciliation before implementation.
- [x] Add row-scoped optimistic state, independent rollback/retry, per-task in-flight protection, and authoritative server results. Keep other task consumers working.
- [x] Real E2E: initial SSR/no duplicate request; new/revisited filters and routes; stale refresh; held/failed writes, reload verification, recurring progress, concurrent mutations/filtering, account switching and sign-out teardown. Reuse manual sessions only.
- [x] Mutation disables rollback or account-key isolation; relevant regression must fail. Restore immediately.
- [x] Run unit/lint/typecheck/build, full browser suite, one independent security/correctness/complexity review, and cleanup. Record commands, request counts, limits, and source guidance in `docs/specs/results/07-task-query-cache.md`.

