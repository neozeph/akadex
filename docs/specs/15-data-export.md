# 15: Account data export

Goal: let a student obtain a complete copy of their academic records. Depends on spec 10.

Stories, each requiring a real E2E scenario:

1. An authenticated student downloads documented structured data covering their profile preferences, semesters, subjects, tasks/series/completions, and focus sessions.
2. Export contains all owned records beyond API page limits, with stable IDs, date/timezone meaning, and format version. It contains no tokens or another account's data.
3. Failed/expired exports report failure without presenting a partial file as complete.

Plan: choose one initial format, proposed JSON. Use scoped paginated reads and existing authorization. Define concurrent-edit consistency in the slice plan. No import feature or background job system unless measured volume requires it.

Test: empty/large account, two accounts, expired auth, failed middle page, and manually verified row counts. Mutation: omit a table/page and confirm completeness assertions fail.

Status: proposed product increment. Review network handler and output privacy.
