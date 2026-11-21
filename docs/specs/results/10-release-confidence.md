# Spec 10: migrations, isolation and regression gates

Status on 2026-11-21: complete locally. The owner explicitly approved generated disposable local CI credentials, and the enabled CI path was verified end to end. No hosted database or GitHub workflow was run, and no changes were staged or committed.

## Migration and direct API evidence

The earlier migration setup checkpoint remains the foundation: explicit baseline adoption/ledger, fresh provisioning, representative upgrade preservation, and repeat-application checks.

Direct authenticated API tests reproduced six accepted cross-account parent writes: insert/update subject-to-semester, task-to-subject, and series-to-subject links. Existing ownership policies blocked foreign reads/updates/deletes but did not couple the foreign key's owner to the child owner. The narrow `20261121060000_owned_parent_links.sql` migration adds composite owner/parent keys for these three observed gaps.

The migration refuses incompatible legacy links without rewriting rows, validates the new constraints before removing the older keys, and preserves nullable links, semester cascade deletion and subject set-null behavior. Fresh/upgrade verification proves both safe refusal and preservation of representative data. Local PostgreSQL 17 was used; no hosted migration was attempted. Follow [migration instructions](../../../supabase/MIGRATIONS.md) before deployment.

All 50 [direct API checks](10-isolation-checks.json) now pass across semesters, subjects, tasks, series, completions and sessions: foreign read/update/delete, owner transfer, anonymous access, foreign parent links, owner reads/updates and recurring completion. [Captured public schema state](10-isolation-schema.json) records the validated constraints and migration ledger without account identifiers or credentials.

Temporarily weakening the isolated subject ownership policy made the foreign-row API assertion fail. The original policy was restored in `finally`, and the restored-code suite passed. No weakened policy remains.

## CI implementation and authorization boundary

The new Node 24 regression job provisions only the dedicated local Supabase, verifies fresh/upgrade migrations and aggregates, then runs `npm run e2e:ci`. Promotion requires both quality and regression jobs. Configuration follows the official [Node action](https://github.com/actions/setup-node), [artifact action](https://github.com/actions/upload-artifact), and [Supabase CI guidance](https://supabase.com/docs/guides/deployment/ci/testing).

The CI runner defaults closed. It requires both explicit authorization (`AKADEX_CI_DISPOSABLE_AUTH=1`) and `CI=true`, plus exact loopback app/API origins. Once authorized, it will generate two run-specific disposable accounts and random passwords, exercise browser registration/sign-out/login and protected-route rejection, save private states separately from manual states, run all functional scenarios, and delete only that run's accounts and files. Browser requests carrying the generated credentials are restricted to the two loopback origins. Raw authentication errors are not serialized.

Manual `e2e/.auth` states remain unchanged. All test consumers, including the baseline preflight identified in review, use the auth-path helper. CI files live only in ignored `e2e/.cache/ci-auth`. Final workflow steps retry scoped cleanup and stop the disposable stack. A terminated/lost hosted runner cannot run cleanup code; its VM/Docker data are ephemeral.

Only `ci-summary.json` and `isolation-summary.json` are artifact-upload candidates. Auth files, environment files, raw Playwright reports, traces, screenshots and database dumps are excluded. Routine analytics verification now writes ignored cache outputs, with explicit opt-in required to update captured evidence. The first spec10 analytics verification regenerated the older mutable timing artifacts; their report now labels that rerun, and [spec10 measurements](10-analytics-regression.json) retain it separately. No historical latency improvement is inferred from it.

The unit and CLI refusal checks prove unauthorized CI starts fail before login. After explicit owner approval, the workflow flag was enabled and the local CI equivalent generated two disposable accounts, exercised browser registration/sign-out/login, passed all 31 functional scenarios, and removed its accounts and private states. See [successful CI summary](10-ci-success.json). GitHub execution itself still requires the owner's later commit/push.

## Verified checks and cleanup

- 172 unit tests across 26 files passed. Typecheck, lint, production build and whitespace checks passed.
- All 31 functional Chromium scenarios passed in 2.6 minutes using the existing manual sessions, including direct isolation, anonymous protected routes, prior task/recurrence/recovery/analytics workflows and account switching.
- Fresh/upgrade migrations, invalid-legacy refusal, cascade/set-null semantics, repeat application and SQL aggregate checks passed.
- Independent complexity/correctness/security review found one CI preflight still using the manual path. It was corrected and the focused follow-up found no remaining actionable issues.
- Cleanup verified zero fixture tasks, subjects, series, events, sessions, semesters, scratch databases or generated CI accounts. The subject ownership policy is restored, manual auth-state hashes are unchanged, no test-server listener remains, the index is empty and HEAD remains `edb93c0`.

Hosted backup/restore and hosted CI execution were not verified: no hosted project was accessed and no uncommitted workflow can be triggered remotely. These remain separate release checks, rather than claims based on the local migration tests.

## Approved CI execution follow-up

The first fresh-account CI run exposed an existing Pomodoro account-switch UI gap: the server rejected the old account's pending save, but the UI depended on an incidental session refresh to leave that timer. `logPomodoroSession` now returns an explicit account-change result; the timer uses the existing session-loss flow and leaves the completion unacknowledged. Genuine save failures remain retryable. The independent focused review found no actionable issue. The next generated-account CI run passed all 31 scenarios in 2.5 minutes.

An intentionally aborted loopback login request, after successful registration, exercised the authentication-failure branch. The runner exited unsuccessfully as expected, emitted only sanitized stage diagnostics, deleted its generated account/state/manifest, and stopped its server. The original runner was restored immediately. See [failure cleanup summary](10-ci-failure-cleanup.json). The earlier failed regression run also reported successful cleanup in [its summary](10-ci-initial-regression.json). Cleanup was then rerun successfully to verify idempotence.

Final cleanup confirmed zero generated CI accounts, fixture rows or scratch databases; manual auth-state hashes remained unchanged and private CI auth files were absent. Final unit verification passed all 172 tests.

## Linux CI shutdown follow-up

The supplied GitHub Actions log showed all 31 scenario checks followed by cancellation at the 25-minute job limit, without Playwright's final summary. A real Playwright/Linux process regression reproduced that hang: its HTTP check passed, but the detached server retained the output pipes after Playwright force-killed its wrapper.

The web-server configuration now requests `SIGTERM` with a 10-second grace period, allowing `run.ts` to stop its owned Next.js child. `e2e/process-shutdown.test.ts` uses the actual configuration and process helper, with a disposable HTTP server and no authentication or database access. In a Node 24 Linux container, removing the option caused the test to time out after 15 seconds; restoring it passed in 1.8 seconds, printed the final summary, and left the server unreachable. The test runs in Ubuntu CI and skips Windows, whose process-tree termination differs. The hosted workflow still needs a new run after the owner commits/pushes this fix.
