# 08: Bounded analytics, aggregates, and streaming

Goal: reports remain accurate with large histories, and independent sections do not wait for the slowest request.

Touchpoints: analytics data/activity/page, dashboard data/page, semester detail page, existing loading primitives, and narrowly scoped SQL migrations.

## Stories and acceptance

1. Seven-day, thirty-day, and all-time reports match hand-derived totals, including spec 05 completion events. Date-limited reports query their time range in SQL. All-time results aggregate without truncation. Current active/overdue counts remain independent of the selected range.
2. Semester data and subject reads run concurrently when ownership predicates permit. Active task counts are grouped in SQL rather than transferring every task ID. Missing/foreign semester behavior remains safe.
3. A delayed chart or secondary section does not block independent ready content. Loading, empty, error, keyboard access, and responsive presentation remain intact.

## Plan and tests

- Capture query plans and timings on the isolated dataset. Add only indexes supported by actual predicates/plans. Six parallel dashboard queries alone do not justify an RPC rewrite.
- Add failing aggregate/date-boundary tests, implement bounded reads and ownership-preserving aggregates, then add focused Suspense boundaries supported by Next.js 16.
- Real E2E: zero/one/many records, over 1,000 historical rows, range changes, foreign semester, partial failure, and a delayed secondary request. Compare totals and timings with spec 01.
- Mutation: remove range predicate or completion source and confirm failure. Review SQL/RPC RLS behavior and avoid security-definer privilege expansion.

Exit: accurate totals and measured improvements. No speculative chart redesign.
