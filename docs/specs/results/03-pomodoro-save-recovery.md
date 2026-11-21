# Spec 03: recover focus-session saves

Status: implemented and verified locally. Independent review remains partial as detailed below.

## Behavior

- A completed focus timer retains its ID, original start, and scheduled completion time until the server acknowledges persistence. Only then does the saved count increase and the break become ready.
- Failures and offline requests expose keyboard-accessible retry. Reload retains the pending completion. The existing database uniqueness constraint handles repeated or ambiguous requests.
- Timer storage is account-scoped. Unowned legacy state is left untouched with a visible explanation. The server rejects an action bound to a different authenticated account.
- Cross-tab reconciliation protects pending completions and acknowledged counts. Tabs share a stable break identity, so delayed acknowledgements cannot reset an already-started break. Running clocks persist deadlines rather than writing every tick.

## Evidence

- Initial recovery tests observed RED before implementation. Additional review regressions observed four failures for delayed completion timestamps and stale-tab reconciliation, then GREEN.
- Mutation removed the awaited persistence acknowledgement: two unit regressions failed. The real-browser S1 also failed because the saving state disappeared before the held response was released. Source restored immediately in `finally`. The first browser mutation exposed a cleanup race; waiting for outstanding route handlers fixed that test cleanup before repeating the check.
- `npm test`: 140 tests passed across 19 files. Lint, typecheck, and production build passed. Build requires access to the project's existing Google Fonts downloads.
- Browser coverage uses real isolated Supabase inserts and real server responses: held acknowledgement, failed insert, offline retry, reload, lost response, overlapping cross-tab retries, delayed acknowledgement, and account switch.
- Captured sanitized database response: [focus session](fixtures/03-pomodoro-session.json), selected after the real S1 insert. Only duration, completion flag, and timestamps are retained. Expected duration 60 seconds and 12:00–12:01 UTC were derived independently from the fixed browser clock.
- First full browser run: eight passed, account-switch expectation failed because Next returned the newly authenticated account's component tree. The test now checks the safe new-account state instead of expecting the previous account's Retry button to remain.
- Final restored-source `npm run e2e:test`: all nine functional scenarios passed in 1.8 minutes. Final unit tests (140), lint, typecheck, and production build passed.

## Review and limits

Used the feature workflow's bugfix gate, systematic debugging, TDD, and Ponytail. No dependencies, schema changes, generic queue, or background sync service were added.

An independent reviewer identified the timestamp and cross-tab risks above; both were addressed. That reviewer exhausted its usage before completing its full review. Remaining complexity, correctness, and security checks were performed locally, including authenticated ownership, UUID-whitelisted test SQL, generic errors, account storage boundaries, and credential-free test output. This is not a claim of a completed independent security audit.

Pending completions depend on available browser storage. When storage is unavailable, the UI warns the user to keep the page open. Nothing is deployed. All changes remain unstaged and uncommitted.
