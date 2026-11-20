# Isolated Akadex verification

Use Node.js 24+, Docker Desktop, and the project's installed development dependencies. The existing application build continues to support its documented Node version. Native TypeScript execution is required only for these E2E commands.

1. `npm run e2e:db` starts the dedicated `akadex-e2e` local Supabase project. On first initialization it applies `supabase/schema.sql`. It does not reset existing databases or link a hosted project. CLI key output is captured, not printed.
2. `npx playwright install chromium` installs the browser once.
3. `npm run e2e:setup` builds the isolated app, opens a headed browser, and waits for manual registration/login of two different disposable local accounts. Do not reuse real passwords. Both accounts must start without academic records.
4. `npm run e2e:test` runs the real create/read/complete/isolation/cleanup and failed-navigation/session scenarios.
5. `npm run e2e:baseline` measures six flows with 20 cold-browser and 20 warm samples per flow. Defaults to instrumentation enabled. In PowerShell, `$env:AKADEX_PERFORMANCE = '0'; npm run e2e:baseline` captures the uninstrumented comparison. Restore or remove the environment override afterward.

App origin must be `http://127.0.0.1:3100`. Supabase must be `http://127.0.0.1:54321`. No existing app server is reused. The runner reads only the local CLI's public configuration, builds into `.next-e2e`, and validates source/build/configuration fingerprints before reusing that build. Missing local services fail closed.

Authentication is always manual. Missing/expired browser state requires rerunning setup. No password, admin key, or real session is committed. The suite needs permission to launch Chromium and terminate its own server process tree on Windows.

Auth state, diagnostics, baseline reports, and cleanup manifests are ignored under `e2e/.auth` and `e2e/.cache`. Snapshots, screenshots, HAR, video, and traces are disabled. Error reports can still include failing test source and matcher diagnostics. Do not publish local test artifacts without inspecting them.

Every run has a unique record prefix. The manifest is written before the first mutation and updated as records are acquired. Normal teardown deletes only that run's tasks and its exact semester. If interrupted, inspect the matching private cleanup manifest and remove only its recorded artifacts. Do not run a database reset or purge unrelated rows. Registered disposable accounts and local container volumes remain available for subsequent tests.

Baseline reports distinguish failed samples from successful distributions. Cold means a fresh browser context, not a cold database/deployment. Current navigation samples are full document navigations. Completion samples begin after interactive readiness and exclude state restoration. Opaque benchmark headers are attached only to the actual navigation/action, not assets or prefetches. Network transfer, loader spans, navigation TTFB, and ready-content time remain separate. The local baseline does not establish deployed regional latency or total server render time.
