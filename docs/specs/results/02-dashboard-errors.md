# Spec 02: dashboard errors and recovery

Status: implemented and verified locally. Scope: dashboard reads and its route-local fallback only.

## Changes

- All six query errors now fail the dashboard using the existing safe server-error helper.
- Missing exact counts and missing row arrays also fail. The installed SDK can normalize an empty HEAD 404 into an error-free 204, so checking `.error` alone is insufficient. Numeric zero and empty arrays remain valid.
- A route-local error boundary displays fixed, generic copy and an accessible retry button. It does not render provider errors or erase the authenticated navigation layout.
- Retry uses the installed Next.js `unstable_retry()` API to refetch Server Components. It exposes pending/disabled/busy states and focuses the error heading on mount.

## Verification evidence

- Initial loader tests: seven observed failures, one legitimate empty-data pass. The real Supabase client is used, with only external fetch responses replayed from captured local API fixtures.
- First implementation: eight loader checks green.
- Review identified missing response/count handling. Seven additional regressions observed red, then all fifteen loader checks green.
- Real browser cases cover successful emptiness, a real partial database permission failure, and recovery to GWA 1.75 / six pending / two completed tasks without reloading the document. The expected values come from the captured baseline dataset and independent arithmetic.
- Delayed retry testing holds an actual server response rather than synthesizing one, verifies the pending disabled button and busy region, releases it, and verifies keyboard focus can return to the enabled button.
- Permission cleanup checks the initial grant, restores only this invocation's outstanding revocation, and always closes the browser context. A second denial attempt verifies pre-existing missing permissions do not cause a grant.
- Mutation: suppressing both error paths produced fourteen loader failures and made browser S2 fail because the unavailable heading was missing. Both guards were restored immediately afterward.

## Workflow and review

- Native execution continues on the existing feature branch. Used the feature workflow's explicit small-bug gate (step 7), with systematic debugging and TDD, rather than requesting approval for another execution method.
- Ponytail cut: no dependency, SQL consolidation, shared error framework, or unrelated UI redesign. Existing Button and safe error helpers are reused.
- One independent reviewer completed complexity, correctness, and security passes. Important findings were fixed and covered by regression checks.
- Minor deferred: the existing privacy test can be written more tersely. Its explicit checks remain correct and have no user-visible impact.

## Final checks

- `npm test`: 130/130 passing across 19 files.
- `npm run lint` and `npm run typecheck`: passing.
- `npm run build`: passing, with font download access.
- Final restored-code `npm run e2e:test`: 5/5 passing in 1.3 minutes, including all three spec 02 stories and both existing functional scenarios.
- Initial provider-failure regressions observed seven failures. Missing-count/row review regressions observed seven failures. Deliberately suppressing both guards produced fourteen loader failures plus a real browser S2 failure. Restored code returned green.
- Local anonymous/authenticated SELECT privileges restored. Seeded semesters, subjects, and tasks removed. No test app listener remains on port 3100.
- No production deployment or hosted database changes are part of this slice.
