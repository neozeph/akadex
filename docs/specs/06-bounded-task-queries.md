# 06: SQL task filters and pagination

Goal: filtering does not retrieve unrelated task history or silently truncate results.

Touchpoints: `src/app/(dashboard)/tasks/data.ts`, tasks page/search toolbar/board, task helpers, and query indexes only if measured necessary.

## Stories and acceptance

1. Active, status, subject, priority, and title/description/tag search preserve current combined filter semantics and shareable URLs. Search values are validated and safely encoded for PostgREST.
2. An account with over 1,000 tasks can reach every matching task through bounded pages. Use deterministic ordering with an ID tie-breaker. Filtering resets pagination. Explain the visible page/window without misleading planner counts.
3. Empty, slow, failed, and expired-session reads show the appropriate existing UI states. Another account's tasks never appear.

## Plan and tests

- First record current filter behavior using real isolated records. Add failing query-boundary regressions for SQL filters, bounded result size, and stable pagination.
- Define page size and planner paging presentation in the slice plan. Preserve date grouping and search OR semantics, including literal punctuation, Unicode, and tags.
- Real E2E: combined filters, cleared filters, empty matches, back/forward URL navigation, a matching record beyond the default API row cap, stable page boundaries, and network failure.
- Mutation: remove a database filter or page boundary and observe the result/network assertion fail. Compare query rows and payload against spec 01.

Exit: complete reachable results and bounded reads. No React Query migration in this slice.
