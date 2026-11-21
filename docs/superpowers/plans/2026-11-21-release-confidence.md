# Release confidence implementation plan

> Execute inline with Superpowers, Ponytail, TDD, real local APIs/browser, and one final independent review. Leave changes unstaged and uncommitted.

Goal: repeatable migrations, direct two-account isolation evidence, and a safe rerunnable CI regression gate.

Checkpoint already implemented in specs 05/08: explicit baseline ledger/adoption, isolated fresh/upgrade databases, representative row preservation, permissions and repeat-application checks. Reuse these commands rather than rebuilding migration tooling.

- [x] Exercise direct authenticated API read/update/delete/owner-change and foreign-parent links for semesters, subjects, tasks, series, completions and sessions. Include legitimate owner operations and anonymous denial. Use the existing manually authenticated local accounts.
- [x] Fix only observed isolation gaps with narrow versioned constraints/policies. Preserve existing records, null relationships, cascade and set-null behavior. Extend fresh/upgrade checks and canonical reference schema. Never repair unrelated data automatically.
- [x] Prepare isolated CI registration/login using generated run-specific disposable credentials, loopback destinations only, separate private auth files, scoped account cleanup, and sanitized summary-only artifacts. Authorization guard defaults closed. Do not authenticate until explicitly approved.
- [x] Add Node 24 CI regression job alongside quality checks, migration/aggregate verification, and gated promotion. No hosted access or production secrets. A GitHub run requires the owner's later commit/push.
- [x] Weaken one local ownership policy, observe a real API regression fail, restore in finally. Run full local verification and independent review, inspect cleanup and record limits. Request authorization only after the exact CI setup is reviewable.

Ruling: local manual browser states stay untouched. CI uses a separate ignored directory. Only summaries containing statuses/counts are uploadable; auth states, raw reports, snapshots, traces, environment files and database dumps are excluded. Hosted backup/restore infrastructure is outside available access and must be reported separately.

- [x] After explicit owner approval: enable disposable CI authentication, run its generated-account workflow locally, and verify cleanup/manual-state preservation. GitHub execution awaits the owner's commit/push.
