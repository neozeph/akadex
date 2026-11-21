# 03: Recover failed focus-session saves

Goal: retain and retry a completed focus session until persistence succeeds.

Touchpoints: `src/components/pomodoro/pomodoro-timer.tsx`, `src/lib/pomodoro-timer-state.ts`, its tests, and `src/app/(dashboard)/pomodoro/actions.ts`.

## Stories and acceptance

1. On successful completion, one session is stored and the existing break transition occurs once.
2. On save failure or offline completion, show an accessible failed/pending state and retry action. Preserve the original completion ID and timestamps across reload. Do not increment saved-session statistics before success.
3. Retrying after an interrupted response or from another tab creates one logical saved session. A different signed-in account never replays another user's pending completion.

## Plan and tests

- Reproduce the current handled-before-save defect with a failing test. Model only necessary persistence states. Scope pending browser storage to account identity and handle legacy snapshots explicitly.
- Real E2E: success, failed save then retry, reload while pending, response lost after insert, duplicate retry, and account switch. Use short valid test durations without changing production defaults.
- Mutation: mark completion handled before persistence and observe recovery assertions fail. Database assertions verify one row per completion ID.
- Use the existing idempotent insert. No generic offline queue or background synchronization framework.

Exit: all three stories, cross-tab behavior, and cleanup verified against isolated Supabase.
