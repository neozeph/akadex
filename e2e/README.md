# Isolated Akadex verification

Use Node.js 24+, Docker Desktop, and the project's installed development dependencies. The existing application build continues to support its documented Node version. Native TypeScript execution is required only for these E2E commands.

1. `npm run e2e:db` starts the dedicated `akadex-e2e` local Supabase project and applies pending versioned migrations. Existing pre-spec05 databases first require explicit fingerprint-checked `npm run e2e:adopt-baseline`. See `supabase/MIGRATIONS.md`. It does not reset existing databases or link a hosted project. CLI key output is captured, not printed.
2. `npx playwright install chromium` installs the browser once.
3. `npm run e2e:setup` builds the isolated app, opens a headed browser, and waits for manual registration/login of two different disposable local accounts. Do not reuse real passwords. Both accounts must start without academic records.
4. `npm run e2e:test` runs the real create/read/complete/isolation/cleanup and failed-navigation/session scenarios.
5. `npm run e2e:baseline` measures six flows with 20 cold-browser and 20 warm samples per flow. Defaults to instrumentation enabled. In PowerShell, `$env:AKADEX_PERFORMANCE = '0'; npm run e2e:baseline` captures the uninstrumented comparison. Restore or remove the environment override afterward.
6. `npm run e2e:verify-db` checks atomic recurrence, permissions, rollback, fresh/upgrade migrations, history retention, and migration-ledger safety in isolated local databases.
7. `npm run e2e:verify-analytics` checks large-history aggregates, timezone/range bounds, deduplication, ownership, and query/payload measurements inside rolled-back local transactions.

App origin must be `http://127.0.0.1:3100`. Supabase must be `http://127.0.0.1:54321`. No existing app server is reused. The runner reads only the local CLI's public configuration, builds into `.next-e2e`, and validates source/build/configuration fingerprints before reusing that build. Missing local services fail closed.

Manual authentication remains the default. Missing/expired manual browser state requires rerunning setup. No password, admin key, or real session is committed. The suite needs permission to launch Chromium and terminate its own server process tree on Windows.

The separate `npm run e2e:ci` path requires explicit owner authorization plus `CI=true` and `AKADEX_CI_DISPOSABLE_AUTH=1`. It generates two disposable local accounts, exercises UI registration/sign-out/login, stores states only under ignored `e2e/.cache/ci-auth`, runs the functional suite, then deletes its own accounts and states. Manual `e2e/.auth` files are never overwritten. `npm run e2e:ci:cleanup` can retry scoped cleanup from the private run manifest. The owner explicitly approved this generated-credential local CI setup on 2026-11-21. The workflow enables it; direct CLI runs still require both authorization flags.

CI uploads only the explicit sanitized summary files, not raw Playwright reports, snapshots, traces, auth files, environment files or database dumps. GitHub's workflow also retries cleanup and stops its ephemeral local stack in final steps. A forced loss of the runner cannot execute cleanup code; the hosted runner and its local Docker data are disposable.

Auth state, diagnostics, baseline reports, and cleanup manifests are ignored under `e2e/.auth` and `e2e/.cache`. Snapshots, screenshots, HAR, video, and traces are disabled. Error reports can still include failing test source and matcher diagnostics. Do not publish local test artifacts without inspecting them.

Every run has a unique record prefix. The manifest is written before the first mutation and updated as records are acquired. Normal teardown deletes only that run's tasks and its exact semester. If interrupted, inspect the matching private cleanup manifest and remove only its recorded artifacts. Do not run a database reset or purge unrelated rows. Registered disposable accounts and local container volumes remain available for subsequent tests.

Baseline reports distinguish failed samples from successful distributions. Cold means a fresh browser context, not a cold database/deployment. Current navigation samples are full document navigations. Completion samples begin after interactive readiness and exclude state restoration. Opaque benchmark headers are attached only to the actual navigation/action, not assets or prefetches. Network transfer, loader spans, navigation TTFB, and ready-content time remain separate. The local baseline does not establish deployed regional latency or total server render time.
