# Spec 07: task cache and optimistic completion

Implemented locally on 2026-11-21. No dependency, schema, deployment, staging, or commit change.

## Behavior

Task pages use the existing React Query dependency with 45-second freshness and five-minute browser memory retention. Keys include account, normalized filters, and page. Full document requests hydrate a fresh server QueryClient; client filter/history and route revisits use the authenticated task API without an unconditional duplicate server task read. Missing fetch metadata conservatively enables SSR seeding.

Ordinary completion updates immediately. Row-specific snapshots restore failed writes without undoing other successful tasks; failures offer retry. Recurring tasks remain visible and disabled until the authoritative next due date returns. Duplicate writes for one task are coalesced. Create/edit/delete invalidate task pages. Pending intents survive background reads and filter changes.

The API and mutation wrappers verify the current account independently of cache keys. Auth changes, missing initial sessions, and sign-out clear protected memory. Canceled/inactive responses cannot repopulate a new account's state. Calendar metadata refreshes separately from cached rows, avoiding stale calendar dates from revisited filters.

## Evidence and limits

- [Read counts](07-cache-reads.json): one initial server task read, zero duplicate hydration reads, one first-filter API read, zero additional reads for fresh filter/route revisits, and one stale refresh after 46 seconds. Counts cover task operations, not every auth/metadata request or hosted latency.
- Real local browser scenarios exercise held/failed writes, explicit retry, persistence after reload, recurring next dates and exactly one event, concurrent independent writes, filter changes, account switching, and protected-cache teardown before a held logout request. Logout is aborted during cleanup to preserve the user's manually created disposable session; this does not claim a new server logout/login flow.
- A write-and-read permission failure exposes actual rollback rather than letting refetch conceal it. Disabling rollback made both the unit regression and real browser scenario fail; the mutation was restored.
- A real SSR-to-hydration missing-session race failed before the initial-session guard and passed afterward. Unit regressions also cover account keys, cancellation, stale hydration, calendar separation, and aborted late responses.
- Preserve spec 01's 3/80 completion/restoration failures and diagnostics. Controlled reconciliation failures were reproduced and repaired here; the 480-observation historical benchmark was not rerun and its failure frequency is not claimed resolved.
- Initial broad regressions exposed current-route account reload, native-history data-wait timing, and hidden Next route content in a settings locator. The timer regression also required resuming its paused test clock for full-document hydration. Assertions still verify persistence and account isolation.
- Independent complexity, correctness, and security review found no remaining actionable findings after fixing the missing initial-session guard.

Implementation followed the installed Next native History/data guides and TanStack's [SSR guidance](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr) and [optimistic update guidance](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates). Cross-view invalidation remains spec 09.

## Final verification

`npm test`: 169 tests across 22 files passed. `npm run e2e:test`: all 22 functional browser scenarios passed in two minutes. `npm run lint`, `npm run typecheck`, `npm run build`, and `git diff --check` passed. Test data, temporary triggers, and scratch databases were removed; task SELECT/UPDATE grants are restored. No local test-server listener remains. The index is empty and HEAD remains `edb93c0`.
