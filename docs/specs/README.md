# Akadex improvement specs

Created: 2026-11-20. Scope: the codebase review and the user's request to implement and test one slice at a time.

## Execution rules

- Follow root `AGENTS.md` and the explicitly invoked `skills/AGENTS.md`, `skills/feature-workflow.md`, and `skills/e2e-testing.md`.
- Read relevant installed Next.js guides before application changes. Start with `node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md`, `07-mutating-data.md`, and `08-caching.md` for data work.
- One numbered story below maps to one rerunnable E2E scenario. Supporting unit and integration checks do not replace the scenario. Leave changes unstaged and uncommitted for the owner.
- Before implementation, write a slice plan naming actual files, apply the required Ponytail cut gate, then follow red/green TDD. Confirm new tests detect the original defect or a deliberately introduced mutation. Restore mutations before proceeding.
- Use captured, sanitized real service payloads where fixtures are needed. Never commit credentials, cookies, tokens, personal account data, or copied production data. Derive expected values independently.
- Run complexity and correctness reviews. Run security review for auth, inputs, SQL, dependencies, network handlers, storage, or other trust boundaries.
- Record commands, outcomes, mutation evidence, E2E evidence, residual risks, and cleanup in a per-slice results file. A planned test is not a passed test.
- Keep UI loading, empty, error, pending, keyboard, and existing interaction states. Do not expand into unrelated refactoring or features.
- No automatic deployment, merge, or production database change is part of these specs.

## Current gates

Superpowers 7.0.1 and Engineering Suite Ponytail 2.0.0 are installed. The user approved native execution of [spec 01's plan](../superpowers/plans/2026-11-20-isolated-verification-and-baseline.md). Implementation is on `codex/spec-01-verification`. See the [verification record](results/01-verification-and-baseline.md) for current evidence and outstanding checks.

The supplied E2E guide is for Clio/Convex, while Akadex uses Supabase/Next.js. Its production isolation, independently derived expectations, and teardown principles apply. Its account identifiers, commands, data imports, webhook setup, and token reuse do not apply and must not be executed here. Local Supabase and Playwright are now configured. The user manually registered two local test accounts. No production data has been used.

## Ordered backlog

| Spec | Slice | Dependency | Status |
| --- | --- | --- | --- |
| [01](01-verification-and-baseline.md) | Isolated verification and performance baseline | Plan approved, isolated environment running | Complete locally, see results and measured failures |
| [02](02-dashboard-errors.md) | Honest dashboard errors and recovery | 01 | Complete locally, [verification](results/02-dashboard-errors.md) |
| [03](03-pomodoro-save-recovery.md) | Recover failed focus-session saves | 01 | Implemented and verified locally; independent review partial, [results](results/03-pomodoro-save-recovery.md) |
| [04](04-user-timezone.md) | Consistent user calendar boundaries | 01 | Complete locally, [verification](results/04-user-timezone.md); migration applied locally only |
| [05](05-recurring-completion-history.md) | Atomic recurrence and completion history | 01, 04, migration setup from 10 | Complete locally, [verification](results/05-recurring-completion-history.md) |
| [06](06-bounded-task-queries.md) | SQL task filters and pagination | 01 | Complete locally, [verification](results/06-bounded-task-queries.md) |
| [07](07-task-query-cache.md) | React Query and optimistic task updates | 02, 06 | Complete locally; [results](results/07-task-query-cache.md) |
| [08](08-reporting-performance.md) | Bounded analytics, aggregates, streaming | 04, 05, migration setup from 10 | Complete locally; [results](results/08-bounded-analytics.md) |
| [09](09-cross-view-consistency.md) | Mutation and cache dependencies | 07, 08 | Complete locally; [results](results/09-cross-view-consistency.md) |
| [10](10-release-confidence.md) | Migrations, isolation, regression gates | 01; migration setup before 05/08 | Complete locally; approved CI login/regressions verified; [results](results/10-release-confidence.md) |
| [11](11-guided-setup.md) | Guided semester/subject/task setup | 09 | Proposed product increment |
| [12](12-today-view.md) | Daily planning view | 04, 07, 09 | Proposed product increment |
| [13](13-task-linked-focus.md) | Start focus from a task | 03, 09 | Proposed product increment |
| [14](14-grade-targets.md) | Grade target calculations | 09 | Proposed, grading policy needed |
| [15](15-data-export.md) | Account data export | 10 | Proposed product increment |
| [16](16-account-deletion.md) | Self-service account deletion | 10 | Proposed, deletion policy needed |
| [17](17-deadline-reminders.md) | Opt-in deadline reminders | 04, 10 | Deferred, delivery decisions needed |
| [18](18-calendar-integration.md) | Calendar integration | 04, 10 | Deferred, provider/sync decisions needed |

Product increments are separately scoped, not bundled into the performance implementation. Decide outstanding product questions when each slice is selected.

## Completion checklist per slice

1. Stories and exclusions agreed through the spec. Required design questions resolved.
2. Workflow dependencies available, plan and cut gate complete.
3. Failing regression observed, minimal implementation complete, mutation check recorded.
4. Real isolated E2E completed for every numbered story, with teardown evidence.
5. Relevant checks plus `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build` pass.
6. Required review findings addressed and reverified. No unsafe logs or artifacts.
7. Results recorded. If any gate is unmet, mark partial or blocked rather than complete.

## Starting evidence

The preceding review ran 86 passing tests in 13 files, lint, typecheck, and a production build. Google Fonts required network access for that build. These results predate implementation and are not completion evidence for any spec. No authenticated latency baseline or live RLS verification has been recorded.
