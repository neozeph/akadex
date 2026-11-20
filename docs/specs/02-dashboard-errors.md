# 02: Honest dashboard errors and recovery

Goal: database failures must not look like an empty academic record.

Touchpoints: `src/app/(dashboard)/dashboard/data.ts`, dashboard page, existing route-loading primitives, `src/lib/server-errors.ts`, and the nearest suitable error boundary.

## Stories and acceptance

1. A student with no records sees legitimate zero/empty states after successful reads.
2. A failed dashboard query shows a generic unavailable state with retry. It never substitutes a zero for failed data or exposes provider details.
3. After the service recovers, retry loads correct records without signing out or a full browser reload.

## Plan and tests

- Add a failing loader regression at the external Supabase boundary for each of the six query failures. Reuse safe errors and existing UI primitives. Choose whole-page failure initially to avoid an unnecessary partial-data model.
- Real E2E: empty account, isolated service/network failure, recovery. Assert expected task counts and grade values derived from captured test records.
- Mutation: remove an error check and confirm the relevant test fails. Ensure the failed-load state cannot be mistaken for an empty state.
- Review error messages, retry behavior, keyboard focus, and sensitive logging.

Exit: all three stories verified. No dashboard SQL consolidation or unrelated styling.
