# Spec 09: mutation and cache dependencies

Implemented locally on 2026-11-21. No dependency or migration added. Changes remain unstaged and uncommitted.

The [implementation plan](../../superpowers/plans/2026-11-21-cross-view-consistency.md) records the mutation-to-view dependency table before implementation.

## Changes

Successful task-dependent writes now use the shared task revalidation path set: tasks, dashboard, semester details, subject workspaces, and analytics. Subject and semester actions retain their list/detail invalidations and include the missing dependent views. Timezone changes include settings and Pomodoro. Focus saves already revalidated Pomodoro, dashboard, and analytics; warm-navigation tests now prove that behavior.

A successful dependent write sets a new opaque session revision cookie. The authenticated layout passes the revision to its provider, which marks only that account's task pages stale. It retains cached rows and does not start duplicate background reads. Existing task mutation handlers retain ownership of optimistic reconciliation, rollback, and active refetches. Inactive task views read fresh data when revisited. Server paths alone cannot invalidate the separate React Query cache.

The cookie contains a random revision only, has HttpOnly/SameSite=Lax scope and a production secure flag, and never authorizes a request. Existing verified identity checks and RLS remain authoritative. No document reload, duplicate router refresh, or polling was added for consistency.

Shared navigation reads the saved profile name, with existing auth metadata fallback, so its name agrees with settings. A successful name save revalidates the shared layout and returns the confirmed display name to the existing account provider. Navigation uses that memory-only confirmed value immediately, including across warm route revisits. Logout/account changes clear it. The action verifies the bound account before writing, and the client verifies the returned account before updating memory. Shared name/fallback rules have a pure unit check. Synchronization of edits made elsewhere is a separate policy.

The name form disables pending input, announces progress/success, and shows a safe inline error on failure. Failed writes preserve the saved profile and navigation name and do not announce success.

## Evidence

- Real browser scenarios first populate dependent route/task caches through client navigation. Subject code/name/grade/units edits update the workspace, task embed and subject choices, semester, dashboard, and analytics. Browser back/forward retains the new state. Deletion preserves the task while clearing its subject relationship and recomputing academic totals.
- A task created and completed from a subject workspace updates the already visited Tasks view, dashboard counts, and analytics. A semester deletion clears subject embeds from an already cached Done task page. A saved focus round updates previously visited dashboard and analytics totals. Existing recurring exactly-once cases remain in the full suite.
- Profile changes reach navigation immediately and after revisiting dashboard/settings. Denying profile UPDATE produces an inline failure while the database and navigation retain the saved name.
- Observed RED for the stale task embed and old navigation name before implementation. Disabling the provider's account query invalidation made the populated-cache browser assertion fail again; the original source was restored in `finally` before final checks.
- A test initially used the wrong grade option value and timed out, leaving one identifiable local fixture. That exact fixture was removed. Subsequent tests use a shorter action timeout, correct option values, fixture-specific cleanup, and hand-derived totals. Temporary route/profile diagnostics were removed.
- Broad verification exposed settings feedback staying pending after the save resolved. The forms now track the awaited save with local pending state rather than the unrelated React navigation transition. Profile success/failure and all existing timezone regressions passed after this correction. Experimental router refresh calls were removed; no underlying framework cause is claimed.
- A warm layout intermittently retained old navigation props even though the response contained the confirmed name. Updating the account provider from the successful action result resolved this scenario in three repeated real-browser passes. A stale form under the second manually authenticated account is rejected before writing, and the previous name override does not cross accounts.
- One independent complexity/correctness/security review found no actionable findings. It confirmed the revision is only an invalidation hint and the provider preserves account scoping and mutation reconciliation.

No historical latency benchmark was rerun. The 45-second cache policy remains unchanged for reads without an application mutation. This slice adds no persistent query cache, universal event bus, or new state library.

Final verification: `npm test` passed 171 tests across 25 files. `npm run e2e:test` passed all 29 functional Chromium scenarios in 2.6 minutes. Typecheck, lint, production build, and whitespace checks passed. Final review and targeted account-clear follow-up reported no actionable findings.

Cleanup confirmed zero fixture tasks, series, completion events, focus sessions, semesters, scratch databases, or temporary test triggers. Permissions and the non-delayed report function are restored. No test-server listener remains. Git's index is empty and HEAD remains `edb93c0`. No commits were created.
