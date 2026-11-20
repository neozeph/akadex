# 10: Migrations, isolation, and regression gates

Goal: ship database changes repeatably and detect real workflow/isolation regressions.

Touchpoints: `supabase/schema.sql`, new versioned migrations, test runner configuration, and `.github/workflows/ci.yml`.

## Stories and acceptance

1. A maintainer provisions a clean isolated database and upgrades an existing representative schema without data loss. Establish this migration setup before specs 05/08. Track deployed baseline explicitly rather than blindly replaying destructive schema statements.
2. Two accounts cannot read, mutate, delete, or cross-link each other's semesters, subjects, tasks, task series, completions, or sessions through direct permitted API access. Test foreign parent IDs as well as row ownership. Tighten constraints/policies only where observed gaps require it.
3. CI reruns login/protected-route, task creation/completion, recurrence, failed save recovery, and analytics scenarios against an isolated app/database. Failures retain sanitized diagnostics and always clean test artifacts.

## Plan and tests

- Separate the migration setup checkpoint from the final regression checkpoint. The latter follows implemented slices, so it does not block every feature indefinitely.
- Capture schema state and sanitized records from the isolated environment. Test fresh install and upgrade. Never copy production credentials/data or apply migrations to production in this task.
- Review runner authentication against the feature workflow's manual-login/throwaway-account restrictions before enabling unattended CI login. Obtain explicit authorization for that test setup.
- Mutation: weaken an ownership policy or remove a completion write in the isolated environment and prove regression checks fail, then restore and rerun.

Exit: reproducible migrations, real isolation evidence, and rerunnable CI coverage. Backup/restore platform checks are recorded separately if access is unavailable.
