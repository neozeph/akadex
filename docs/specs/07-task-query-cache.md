# 07: React Query and optimistic task updates

Goal: reuse recently fetched task data and give immediate, reversible completion feedback.

Baseline follow-up: spec 01's repeated completion measurements exposed intermittent completion/readiness or reconciliation failures. Preserve its failure diagnostics and reproduce the failing behavior before changing optimistic state. Do not report a checkbox transition as persisted success without verification after reload.

Touchpoints: existing `@tanstack/react-query` dependency, authenticated provider boundary, task queries/actions, tasks page/board/card, and sign-out/account switching.

## Stories and acceptance

1. Initial server-rendered tasks hydrate the browser cache without an immediate duplicate read. Query keys include account, normalized filters, and pagination. Revisit within the configured freshness window reuses data.
2. Completing a task updates visible state immediately, reconciles the returned server result, and rolls back on failure with a retry message. Recurring tasks follow spec 05 when available and must not be treated as ordinary removal.
3. Filter changes, background refresh, and concurrent mutations retain coherent UI. Signing out or switching accounts clears protected cached data. Server query clients never share data between requests.

## Plan and tests

- Read installed Next.js caching/mutation guides and current TanStack SSR guidance. Use a stable browser client and request-scoped server clients. Start with a measured 30-60 second freshness policy, not a universal permanent cache.
- Define one owner for task reads. Hydrating a client while unconditionally rerunning the old server loader on each filter navigation does not satisfy this spec. Select the authenticated read boundary before implementation.
- Test cache key isolation, cancellation, stale refresh, rollback, and duplicate mutations. Real E2E measures request counts on hydration/revisit and task state during delayed/failed writes.
- Mutation: disable rollback or omit account from keys and demonstrate failure. Keep authoritative session checks and RLS. No new state library.

Exit: repeat-navigation and completion improvements measured against baseline without regressions in initial load or privacy.
