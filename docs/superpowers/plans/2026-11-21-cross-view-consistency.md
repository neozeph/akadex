# Cross-view consistency implementation plan

> Execute inline with Superpowers, Ponytail, TDD, real local E2E, and one final independent review. No staging or commits.

Goal: successful mutations appear in previously visited affected views without a manual reload.

## Actual mutation dependencies

| Mutation | Server views | Browser task cache |
|---|---|---|
| Subject create/update/delete (name, code, grade, units) | Semester list/detail, affected subject workspace, dashboard, analytics, task subject choices/embeds | Account task pages: subject embeds and deleted subject assignments |
| Semester create/update/delete | Semester list/detail and descendant workspaces, dashboard, analytics, task choices/embeds after cascade | Account task pages after subject cascade/semester metadata changes |
| Task create/update/delete/complete/recurring completion | Tasks, dashboard, semester detail, subject workspace, analytics | Account task pages, including writes initiated outside Tasks |
| Focus session save | Pomodoro, dashboard, analytics | None |
| Focus duration update | Pomodoro | None |
| Profile name | Settings and shared navigation | Confirmed navigation name in account memory |
| Timezone | Settings, tasks/calendar, dashboard, Pomodoro, analytics | Account task pages/calendar |

Architecture: retain scoped server path invalidation. A successful task-dependent mutation changes an opaque, session-only revision cookie. Next's documented Server Action cookie update rerenders the layout; the authenticated provider marks that account's task queries stale when the revision changes. It does not fetch inactive views or clear unrelated cache. Existing local mutation reconciliation owns active task refetches. No protected data is stored in this cookie, and it is never authorization.

- [x] Add warm-navigation browser regressions for subject edits/deletion, task writes outside Tasks, profile name/failure, semester cascades, focus totals and browser history. Observe failures before implementation.
- [x] Add a small shared server invalidation helper for the existing repeated task path set and revision stamp. Use it after successful task/subject/semester/timezone writes. Fill missing academic/workspace paths.
- [x] Bridge the revision into the authenticated provider without duplicate reads or weakening account isolation. Test stale marking preserves cached rows and skips other accounts.
- [x] Read the profile name in navigation, refresh the shared layout after profile save, and give the existing name form pending/error feedback. Preserve failed data.
- [x] Mutation-remove a necessary browser invalidation and prove a warm-cache scenario fails. Restore immediately. Run unit/browser/lint/typecheck/build, final review, cleanup and result ledger.

Ruling: no universal event bus, persistent query cache, polling, or new dependency. The revision carries only invalidation intent. Current Next broad router refresh is temporary behavior, so explicit dependent paths remain documented and tested separately.

Ruling: navigation uses the account-checked name returned by a successful save, in addition to its canonical SSR profile read. Warm layout props did not consistently update immediately in the real browser. The override lives only in the existing account provider and clears on account teardown. Settings form pending state follows the save promise, independently of route transitions. No extra router refresh remains.
