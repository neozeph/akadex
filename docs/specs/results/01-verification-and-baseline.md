# Spec 01 verification record

Status: spec 01 implemented and verified locally. No production changes. Baseline observations include the application failures described below, which remain work for a later slice.

## Environment

- Branch: `codex/spec-01-verification`, native execution approved by user.
- Node 24.21.0, Playwright Test 1.65.1, Supabase CLI 3.2.0.
- Dedicated local Docker Supabase project: `akadex-e2e`, API port 54321.
- Dedicated Next production-mode app: loopback port 3100, build directory `.next-e2e`.
- Two disposable accounts manually registered by the user. Browser state stays ignored under `e2e/.auth`. No account passwords were supplied to the agent.
- Local schema initialization completed using existing `supabase/schema.sql`. No hosted Supabase link, production schema change, deployment, merge, or data copy.

## Observed evidence

- Before changes: 86/86 unit tests in 13 files passed.
- Environment guard: missing implementation observed first; after implementation 11/11 checks passed. Deliberately bypassing destination checks caused nine failures, then restoration returned green.
- Performance wrapper: missing implementation observed first. Forcing diagnostics always on caused two privacy/default-state failures, then restoration returned green.
- Baseline percentiles: independently expected nearest-rank p50 10 and p95 19 for values 1..20. Empty/failed runs return no invented successful percentile.
- Review regression tests: verification failure counted as failure exactly once, disconnected action failed without running verification, and local benchmark correlation. All observed RED before fixes, then GREEN.
- Build fingerprint test: missing implementation observed RED, then GREEN with real temporary files and changed source. Auth state is outside fingerprint inputs.
- Windows process-tree cleanup test: missing implementation observed RED. Sandboxed process control timed out; rerun with permission passed using real owned parent/descendant processes. Full checks must use the same required process permission.
- First real browser pass: story 3 passed. Story 1 caught a selector including hidden streamed dashboard content. Scoped it to accessible article roles. Both scenarios require a fresh successful rerun before completion.
- A temporary `e2e/package.json` with `type: module` caused a Playwright loader conflict. Removed it after reproduction. Native runner's Node module-detection warning is retained rather than changing the application's package mode.

## Review and rulings

- Independent reviewer performed complexity, correctness, and security passes without reading session state. Important findings included failed-sample accounting, metric attribution, diagnostic overhead in network spans, process-tree shutdown, run journaling, exact page readiness, preflight of both sessions, and private failure snapshots.
- Ruling: exact loopback origins instead of configurable destinations. Cost: another port requires an explicit change.
- Ruling: preserve current checkout and use a feature branch rather than copy untracked user files into a worktree. Cost: changes remain visible in the current checkout.
- Ruling: use Playwright with manually authenticated local sessions in place of unavailable `claude-in-chrome`. Preserve isolation and login boundaries from the supplied Clio guide. Cost: a new browser-suite development dependency.
- Ruling: build fingerprints permit instrumented/plain runs against the same verified source/build/target. A changed source, key fingerprint, backend, or app origin requires rebuilding. Cost: hashing source files at startup.
- Ruling: metrics use random per-request benchmark correlation only in local E2E, not account identifiers or wall-clock attribution. Background asset/prefetch traffic is excluded. Cost: local-only diagnostic header and async context plumbing.
- Ruling: diagnostic body inspection is capped at 2 MiB and buffers a clone only when enabled. Larger responses report unknown bytes/rows, not truncated totals. Parsing is outside network duration. Cost: instrumented mode still has overhead, measured separately.
- Ruling: expired-browser-session coverage removes cookies from a manually authenticated context. It does not claim provider-side revocation or actual JWT expiry coverage, which remains a later release test.
- Ruling: a baseline collects all requested observations, including app failures, and reports failure rates separately. It does not require an already bug-free app. Functional E2E remains a separate pass/fail gate. Cost: a successful collection is not proof that every measured application action succeeded.
- Ruling: task mutation timing starts only after a real client dialog open/close proves interactive readiness. No fixed sleep or production hydration marker was added. Cost: this baseline does not measure the initial pre-hydration click experience.

## Final verification

- `npm test`: 115/115 passed in 18 files, including real owned-process cleanup. Windows process-control permission was required.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed, with Google Fonts network access.
- `npm run e2e:test`: final restored-code pass, 2/2 scenarios passed in 53.5 seconds.
- `npm run e2e:baseline`: instrumented collection passed, all 240 observations recorded.
- `AKADEX_PERFORMANCE=0 npm run e2e:baseline`: plain collection passed, all 240 observations recorded. Both reports identify the same Next build.
- E2E mutation: temporarily omitted the ordinary completion write. Both functional scenarios failed on the missing task-state transition, exit 1. Mutation restored, no remaining diff in task actions, final functional pass green.
- Real PostgreSQL fixture captured and used by subsequent scenario setup. See `e2e/fixtures/README.md` for provenance and independently derived values.
- Summary validation: twelve flow/temperature groups, twenty observations per mode in every group. No incomplete cleanup manifests.
- Database cleanup verified directly: zero semesters, subjects, tasks, task series, and focus sessions remain. Two manually created disposable accounts and local Supabase containers remain for subsequent specs. No app server remains on port 3100.
- Independent review's important findings addressed. No deferred minor findings reported by the reviewer. The native TypeScript runner emits a benign module-detection warning. It is retained to avoid changing the app's module mode after a reproduced Playwright incompatibility.

## Measured local baseline

Both 240-observation collection scenarios completed against the same verified build and equivalent data. See `01-baseline-summary.json` for full summaries. The table below reports uninstrumented successful observations in milliseconds. Failures are separate, not zero-duration samples.

| Flow | Cold p50 / p95 | Warm p50 / p95 | Failed cold / warm | Median measured server requests with diagnostics |
| --- | --- | --- | --- | --- |
| Dashboard | 184.9 / 195.3 | 151.1 / 176.4 | 0 / 0 | 7 |
| Task filter | 180.0 / 201.9 | 147.4 / 168.1 | 0 / 0 | 3 |
| Task completion | 93.1 / 109.3 | 92.3 / 115.0 | 0 / 1 | 7 |
| Semester | 178.7 / 200.5 | 153.0 / 167.1 | 0 / 0 | 4 |
| Analytics 7 days | 198.1 / 215.6 | 194.7 / 215.9 | 0 / 0 | 5 |
| Analytics 30 days | 211.2 / 256.2 | 196.6 / 220.3 | 0 / 0 | 5 |

Instrumented completion had two failed cold observations out of twenty. Both had persisted in the database when checked through a fresh page, but the visible task did not disappear within the five-second UI check. The single uninstrumented warm failure occurred during the verification/restoration phase, after a 91.1 ms successful measured completion. Its task was active at recovery, consistent with the restoration having saved while its UI failed to reconcile. That recovery observation does not establish a lost completion write. Overall: 3 failed completion/restoration cycles among 80 observations, no failures among 400 other observations. Preserve both the failure stage and recovery state when investigating spec 07.

Observed on/off p50 differences range from about -7.8 to +14.8 ms across these flows. Sequential workstation runs have noise and different server warmth, so this is descriptive and must not be presented as a causal overhead estimate or production speedup. Diagnostics remain off by default.

## Measurement limits

- Local timings do not measure deployed Vercel/Supabase regional latency.
- Cold means a fresh browser context, not a restarted database or cold deployment.
- Navigation timing and individual auth/network/loader spans are separate. Overlapping spans are not summed. Loader spans are not total server rendering time.
- Current baseline navigations are document navigations. React client-transition/cache behavior needs its own comparison when spec 07 changes that behavior.
