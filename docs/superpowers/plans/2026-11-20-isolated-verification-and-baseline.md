# Isolated Verification and Performance Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Establish isolated, rerunnable browser verification and a measured baseline before changing Akadex's data behavior.

**Architecture:** Run a production-mode Next.js app against a local Supabase instance dedicated to E2E. Playwright reuses manually authenticated, ignored browser state for two test accounts. Opt-in measurements separate Supabase network calls, data-loading spans, and browser navigation, without recording credentials or request contents.

**Tech Stack:** Existing Next.js 16.2.7, React 19, Supabase, TypeScript, and Vitest. Add Playwright Test as the single browser-suite dependency and Supabase CLI as local development tooling. No telemetry vendor or generic benchmarking framework.

**Spec:** `docs/specs/01-verification-and-baseline.md`

## Global Constraints

- Production is never a fallback. Use two dedicated accounts and unique test-run record prefixes. Record cleanup.
- Never log identifiers, search text, tokens, or full payloads.
- No unattended authentication using discovered credentials. At a login wall, the user logs in manually.
- Hand-derive expected values. Capture real service payloads before creating sanitized committed fixtures.
- One story = one committed rerunnable scenario. Observe failing checks, including deliberate mutations, before claiming coverage.
- No cache rewrite or index addition in this slice. No production database changes, deployment, merge, or unrelated cleanup.
- Follow `skills/feature-workflow.md` and root Next.js documentation rule. Apply the original E2E guide's isolation and teardown principles to Supabase, not its Clio commands.

## Review Focus

1. A reused Next build must not retain a different Supabase target. Build and server start both require the same verified local environment.
2. A stale browser session must halt at login, never pass because a redirect finished quickly.
3. A network failure must remain a failed sample, never a zero-duration successful result.
4. Parallel server queries overlap. Report their individual spans and page elapsed time rather than adding their durations.
5. Diagnostics must remain off by default and must never serialize URL queries, cookie/header values, or response bodies.

## Preflight and decisions for review

- Current checkout: `main`, normal repository, not a linked worktree. Only `skills/` and the prepared specs are untracked. Preserve them.
- No local `.env.local`, Supabase CLI/config, or Playwright installation was found. Docker is installed, but the engine is stopped. Do not claim a runnable isolated environment yet.
- Recommended execution: native implementation in this chat, with a fresh final reviewer. Confirm worktree preference before creation, as required by using-git-worktrees. In-place execution preserves the current prepared files without copying them.
- Recommended test backend: local Supabase after Docker starts. No paid cloud provisioning. Initialize local Supabase, apply `supabase/schema.sql` only to that verified local instance, and leave destructive resets out of normal test commands.
- Proposed browser-driver adaptation: Playwright for the committed suite. A headed setup flow pauses for the user to create/log into two throwaway local accounts. Never type passwords or automatically reuse a real account.
- User review must confirm this plan and execution method before application/tooling implementation, per writing-plans. Start Docker and install/download development tooling during execution only after the plan is accepted and any required sandbox approvals are granted.

## Task 1: Guarded isolated browser suite

**Files:** Create `supabase/config.toml`, `playwright.config.ts`, `e2e/environment.ts`, `e2e/environment.test.ts`, `e2e/setup.ts`, and `e2e/baseline.spec.ts`. Modify `package.json`, `package-lock.json`, `vitest.config.mts`, and `.gitignore`. Create `docs/specs/results/01-verification-and-baseline.md` for evidence.

**Interfaces:** `assertLocalE2EEnvironment(appUrl: string, supabaseUrl: string): void` rejects non-loopback hosts, URL credentials, and unsupported schemes. `e2e/setup.ts` saves account A/B browser state under ignored `e2e/.auth/` only after the user manually authenticates. Playwright runs on `http://127.0.0.1:3100` against local Supabase at `http://127.0.0.1:54321`. Do not rely on a separately asserted variable while the actual Next build targets a different backend.

- [x] Write `e2e/environment.test.ts` first. Accept the exact local defaults. Reject `https://akadex.vercel.app`, any `https://*.supabase.co` target, `http://127.0.0.1.example.com`, `http://localhost@evil.example`, missing values, and mismatched build/runtime target configuration. Expected: `assertLocalE2EEnvironment` throws before any write or launch.
- [x] Run `npx vitest run e2e/environment.test.ts`. Confirm the missing implementation fails, then implement the guard and rerun to green. Remove a hostname condition temporarily and prove its negative case fails. Restore it.
- [x] Add guarded commands `e2e:setup`, `e2e:test`, and `e2e:baseline`. Playwright uses one worker, zero retries for baseline measurements, and no production web-server reuse. Vitest excludes browser specs explicitly while retaining guard tests. Ignore browser auth, reports, traces, raw recordings, local Supabase scratch files, and generated baseline results. Disable HAR/video/screenshots/traces by default.
- [x] Establish local Supabase, apply the existing schema locally, build/start Next with verified local public configuration, and let the user authenticate two dedicated accounts through headed setup. After session expiry, stop and repeat manual authentication. Do not extract or print credentials/session tokens.
- [x] Implement story 1 as an actual guarded create/read/cleanup scenario through the app UI and real Supabase. Account A creates one prefixed semester, two subjects (3 units at 2.00 and 1 unit at 1.00), six active tasks and two completed tasks. Expected GWA is 1.75, graded units 4, active tasks 6, completed tasks 2. Account B must not see A's records. Use accessible labels, not arbitrary sleep delays. Cover an empty account before seeding and persist only sanitized actual response fields for any fixture.
- [x] Implement cleanup in `finally`, using the app's existing delete flows and the run's own semester/task IDs or exact unique names. Never delete unrelated rows or reset the database. On interruption, record the run prefix and leftovers for explicit cleanup.
- [x] Validate expired-session behavior and failed/offline read behavior without manufacturing successful responses. Baseline readiness assertions must distinguish an authenticated page from `/login` or an error page. Remove a UI write deliberately and confirm story 1 fails, then restore it.

## Task 2: Private measurements and reproducible baseline

**Files:** Create `src/lib/performance.ts` and `src/lib/performance.test.ts`. Modify `src/lib/supabase/server.ts`, `src/lib/supabase/session.ts`, relevant dashboard/task/analytics loaders, `src/app/(dashboard)/semesters/[semesterId]/page.tsx`, `e2e/baseline.spec.ts`, `.env.example`, and the task 1 evidence file. Do not change query semantics.

**Interfaces:** `measureOperation<T>(operation: OperationName, run: () => Promise<T>): Promise<T>` preserves values/errors and emits a fixed operation label, elapsed milliseconds, and success flag only when `AKADEX_PERFORMANCE=1`. `OperationName` is a finite union for auth, dashboard, planner, semester, academic analytics, and activity analytics. A Supabase `global.fetch` wrapper records only allowlisted operation/table categories, duration, HTTP status, returned-row count when available, and response byte size. Never record raw URLs, headers, user IDs, SQL, filter values, or provider error text.

- [x] Write failing measurement tests using clock/network boundaries. Assert exact pass-through values and errors, silence when disabled, finite nonnegative durations, concurrent-span independence, and absence of a sentinel token/user/query string in emitted output. Hand-set expected timing values with a fake clock, not the production measurement function.
- [x] Implement the smallest opt-in wrappers. Preserve fetch options, abort signals, response consumption, and exceptions. Time network completion before optional diagnostic body-clone parsing. Count decoded payload bytes accurately and label their scope. Do not mistake `Content-Length` for a guaranteed decoded size. Inspect streamed, empty, and failed responses in tests.
- [x] Add story 2 as one baseline scenario covering dashboard, task filter, task completion, semester detail, and analytics `7d`/`30d`. For each flow, collect 20 cold-browser samples using fresh contexts and 20 warm samples after one unrecorded warm-up. Cold means browser state/cache only, not guaranteed cold database or platform startup. Restore task completion state between samples and verify the requested state after every measured mutation.
- [x] Emit a local JSON report with sample counts, environment/build identity, dataset counts, durations, query counts, row counts, and bytes. Report nearest-rank p50 and p95: for samples 1..20 these are 10 and 19. Keep failures visible and separate from successful distributions. Require matching metadata for comparisons. Keep auth/database spans, loader spans, navigation TTFB, and ready-content elapsed time separate. State that loader spans are not a measurement of total server rendering.
- [x] Add story 3 as a verification/mutation pass: remove a real completion side effect temporarily and confirm the persisted-state assertion fails. Restore it and rerun. Disconnect one real network request and confirm the run reports failure rather than a successful timing. Capture sanitized payload provenance and hand-derived expectations in the evidence file.
- [x] Compare instrumented and uninstrumented local samples to quantify diagnostic overhead. Record local-only geography accurately. A local baseline cannot establish deployed Vercel-to-Supabase latency, so leave production-region measurements explicitly pending rather than inventing them.

## Final verification and handoff

- [x] Re-arm Ponytail before code. Use executing-plans or subagent-driven-development according to the user's selected method, and read TDD before implementation.
- [x] Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run e2e:test`, and `npm run e2e:baseline` against the verified isolated environment. Read all results. Record the exact resolved dependency versions.
- [x] Run complexity review, correctness review, then security review for the new dependencies, environment guards, session files, and network instrumentation. Address findings and rerun affected checks. Never include browser auth files in a diff or review payload.
- [x] Record red/green/mutation evidence, real timings, cleanup, and limitations in `docs/specs/results/01-verification-and-baseline.md`. Mark spec 01 complete only if all three stories pass. Keep spec 02 waiting otherwise.
- [x] Self-review completed during planning: all three stories map to tasks, all five Review Focus items map to explicit tests, and task 2 consumes task 1's verified environment/state. No cache, index, production, or feature behavior changes are bundled here. Commit only after verification if permitted by the chosen execution flow. Do not merge or deploy.
