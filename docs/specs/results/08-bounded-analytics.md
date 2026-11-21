# Spec 08: bounded analytics and independent sections

Implemented locally on 2026-11-21, with task-result toasts requested alongside this spec. No dependency was added. Changes remain unstaged and uncommitted.

## Behavior

Activity reports aggregate tasks, recurring completion events, and completed focus sessions inside PostgreSQL. Seven- and thirty-day ranges apply exclusive timestamp bounds in SQL using the saved account timezone. All-time charts aggregate into months, so raw history cannot be truncated by the API's 1,000-row cap. Current active/overdue and legacy-undated counts stay independent of the range. Existing recurring occurrence deduplication and future-date exclusion remain intact.

All three functions use invoker permissions, explicit `auth.uid()` predicates, table RLS, an empty search path, and authenticated-only execution. Dashboard keeps its existing concurrent queries and uses a scalar aggregate for daily focus totals. Academic metadata reads use stable pages of 500 rows and preserve the existing weighted GWA calculation.

Semester, subjects, and grouped task counts start concurrently under their own ownership predicates. Both metadata and grouped count results paginate beyond the service cap. Missing or foreign semesters retain the safe redirect.

Analytics academic and study sections stream independently with local loading states and safe, keyboard-accessible retry links. A secondary failure leaves the other section available. No chart redesign was introduced.

Task create/edit/delete and completion/reopen now show confirmed-result toasts. Failures show a short toast while retaining inline errors and retry. The installed Radix primitive handles announcements, focus, swipe, dismissal, and timeout. At most three notices remain in memory, inside the protected account boundary, and account teardown removes them.

## Evidence

- Real SQL fixtures cover zero/one/many records, 2,209 tasks, 1,101 sessions, recurring-event deduplication, exact Manila boundaries, future exclusion, current counts, foreign ownership, and grouped counts. Transactions roll back, including disposable SQL-only fixture users. The [captured aggregate](fixtures/08-activity-report.json) drives the real SDK boundary unit test.
- Real browser cases check all three ranges, 1,102 tasks in one subject, then 1,002 subject groups and 2,103 active tasks, complete subject metadata, another account's semester, daily dashboard focus totals, delayed study activity, safe partial failure/retry, confirmed toast results, keyboard dismissal, and persistence after reload. Existing timezone/DST and recurring-history regressions remain in the full suite.
- Before implementation, browser regressions failed on truncated semester counts, missing independent loading, and missing toast feedback. Independent review then found the grouped RPC also needed pagination. A 1,002-subject fixture failed before that fix. Review of the fix found no remaining actionable issues.
- Removing the live SQL task-completion range predicate made the real SQL regression fail. The original function was restored in `finally`, and verification passed afterward. No mutation remains.
- Fresh/upgrade migration checks include all three functions' invoker rights and execution grants. Apply `20261121050000_analytics_aggregates.sql` before deploying this application to a hosted database, following [migration instructions](../../../supabase/MIGRATIONS.md). Only local Docker was migrated here.

## Measurements and limits

[Measurements](08-measurements.json) compare complete raw task/session/event projections with the aggregate on the same isolated fixture: 369,839 serialized JSON bytes versus 294 bytes. This is a data-transfer reduction, not a hosted response-time claim. The old API would truncate task/session projections at 1,000 rows; the complete projection is deliberately used to compare equivalent data coverage.

Five local SQL timings for each shape are recorded. The aggregate performs more database work than the raw task projection, which excludes focus/event reads; those SQL timings are not an equivalent end-to-end latency comparison. The [range query plan](08-query-plan.txt) uses the existing owner index. No new index was justified on this dataset.

Spec 10 reran the verifier after adding ownership indexes. The linked measurement/plan artifacts now record that later regression run; the payload sizes are unchanged. Original spec 08 SQL medians remain in the verification record below. Routine verification now writes ignored cache outputs; updating captured report artifacts requires explicit `AKADEX_CAPTURE_ANALYTICS=1`.

A real four-second delayed SQL report leaves academic content ready while study activity still shows loading. Spec 01 used eight tasks; its latency benchmark and 480 observations were not rerun or treated as directly comparable to this larger fixture. Metadata pagination preserves correctness, but still transfers all academic metadata to calculate GWA. Toast scope is task actions; other forms retain their existing feedback.

Commands: `npm run e2e:verify-analytics`, `npm run e2e:verify-db`, `npm run e2e:test`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.

Final verification: 169 unit tests across 23 files passed. All 25 functional Chromium scenarios passed in 2.6 minutes. Lint, typecheck, production build, SQL aggregate checks, fresh/upgrade migrations, and whitespace checks passed. SQL median execution was 1.440 ms for the raw task projection and 10.044 ms for the complete activity aggregate; see the limits above.

Cleanup confirmed zero fixture tasks, series, completion events, sessions, semesters, scratch databases, or temporary test triggers. Permissions and the unmodified report function are restored. No test-server listener remains. Git's index is empty and HEAD remains `edb93c0`.
