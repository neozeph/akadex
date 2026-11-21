# 12: Daily planning view

Goal: make overdue and today's work immediately actionable. Depends on specs 04, 07, and 09.

Stories, each requiring a real E2E scenario:

1. A student sees overdue and today's active tasks with quick completion and subject context.
2. Completed, future, and undated tasks follow an explicitly documented grouping policy, with no silently omitted matching tasks from pagination.
3. At the user's day boundary, groups update consistently. Failed completion restores the previous task state with retry.

Plan: select dashboard enhancement or a dedicated route before code. Reuse task cards, completion behavior, and timezone rules. No duplicate task source or independent cache model.

Test: empty day, overdue/today/future/undated records, midnight, recurrence, large account, rollback, and keyboard flow. Derive expected groups manually. Mutation: misclassify a due date and confirm failure.

Status: proposed product increment. No calendar or reminder work included.
