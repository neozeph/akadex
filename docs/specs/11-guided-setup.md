# 11: Guided semester, subject, and first task setup

Goal: shorten the path from an empty account to usable academic planning. Depends on spec 09.

Stories, each requiring a real E2E scenario:

1. A new student creates a semester, adds a subject, and creates its first task through existing forms with clear next steps.
2. A student skips or resumes setup without duplicate records or losing saved work.
3. An existing account retains direct access to its normal dashboard and is not forced through setup.

Plan: reuse dashboard empty states and existing dialogs. Decide the minimum completion condition from actual records. Instrument only aggregate setup progress if measurement is added. No separate onboarding engine or new visual system.

Test: empty/existing account, partial setup and reload, failed write, keyboard completion, and duplicate submit. Mutation: suppress the next-step state and observe the scenario fail. Record setup completion time on the isolated baseline account.

Status: proposed product increment. Do not start before reliability/performance slices are verified.
