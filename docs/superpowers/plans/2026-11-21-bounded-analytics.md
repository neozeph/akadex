# Bounded analytics implementation plan

> Execute inline with Superpowers executing-plans, TDD, Ponytail, real local E2E, and one independent final review. Leave all changes unstaged and uncommitted.

Goal: accurate large-history reports and independently streamed analytics sections.

Architecture: invoker-only SQL functions aggregate activity by local day/month, count current state independently, and group active tasks by subject. Existing timezone helpers define exclusive UTC report bounds. Analytics renders academic and activity promises in separate Suspense boundaries with recoverable section errors. Preserve the dashboard's existing parallel reads, replacing only its unbounded daily focus rows with an aggregate.

- [x] Capture pre-change plans/timings and observe a failing real SQL regression for over 1,000 rows, ranges, recurrence deduplication, foreign ownership, and grouped subject counts.
- [x] Add narrow migrations and update activity loader, daily dashboard focus read, and concurrent semester reads. No speculative indexes.
- [x] Unit-test the real SDK request boundary and aggregate-to-chart mapping. Retain existing date/bucket tests.
- [x] Separate analytics sections with Suspense. Prove delayed/failed activity does not block academic content in a real browser.
- [x] Add task-result toasts after clarifying scope. Keep durable inline errors and retry. Reuse installed Radix primitives and theme tokens, without adding a dependency.
- [x] Mutation-check a range/source predicate, restore, then run complete unit/browser/lint/typecheck/build and migration checks. Review complexity, correctness, security once and record evidence.

Ruling: academic subject and semester lists are metadata rather than activity history. Keep their established calculations; ensure their reads paginate beyond the service cap without introducing a second GWA implementation.
