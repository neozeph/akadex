# 01: Isolated verification and performance baseline

Goal: establish rerunnable real-system verification and measure before optimizing. This is the first implementation slice after workflow dependencies are resolved.

Touchpoints: `package.json`, `vitest.config.mts`, `.github/workflows/ci.yml`, data loaders, and `src/lib/supabase/session.ts`. Select a browser runner only after resolving the workflow's unavailable `claude-in-chrome` driver. Read the computer-use skill if selecting its tools.

## Stories and acceptance

1. A tester runs Akadex against an isolated Supabase project and local/preview app. Verify destination before writes. Production is never a fallback. Use two dedicated accounts and unique test-run record prefixes. Record cleanup.
2. A maintainer reproduces dashboard, task filtering, task completion, semester detail, and 7/30-day analytics timings. Separate auth, database, server rendering, and browser response timing. Compare cold and warm runs on the same dataset, region, and production-mode build. Record dataset size, query count, returned rows, payload size, and p50/p95 over a declared sample count. Never log identifiers, search text, tokens, or full payloads.
3. A tester reruns a committed scenario and sees a deliberately broken result fail. Restore the code and observe it pass. Preserve sanitized service-response fixtures only where needed.

## Plan and tests

- Establish the isolated environment and runner before adding E2E dependencies or fixtures. Capture baseline evidence, not invented timings. Record Vercel and Supabase regions without copying secrets.
- Scenarios: environment destination guard rejects production, seeded user flow executes against the real app/database, and the timing output corresponds to real operations. Derive expected record counts manually.
- No unattended authentication using discovered credentials. At a login wall, the user logs in manually. Testing login itself requires explicit authorization and a supplied throwaway account under the workflow rules.
- Include empty, one, many, failed request, expired auth, and interrupted run cases as applicable. Report unsupported fault injection rather than simulating success.

Exit: committed rerunnable scenario, real baseline, observed red/green evidence, cleanup, and recorded driver decision. No cache rewrite or index addition in this slice.
