# 13: Start focus from a task

Goal: connect planned work with focus history. Depends on specs 03 and 09.

Stories, each requiring a real E2E scenario:

1. A student starts focus from a task and sees its subject/task context in the timer.
2. A completed session persists the selected relationship and contributes to subject focus totals without duplicate saving.
3. Deleted tasks and changed accounts cannot attach sessions to foreign or invalid records. Unlinked focus sessions remain supported.

Plan: add only necessary nullable relationships through versioned migrations. Reuse timer persistence and its idempotent save contract. Define whether history retains a label snapshot after task deletion before schema changes.

Test: linked/unlinked session, failed-save retry, task deletion while running, account switch, and direct foreign-ID submission. Mutation: drop the relationship on save and confirm failure.

Status: proposed product increment. No automatic task completion or productivity scoring.
