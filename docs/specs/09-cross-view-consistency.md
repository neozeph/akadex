# 09: Mutation and cache dependencies

Goal: successful changes appear consistently across every affected previously visited view.

Touchpoints: semester/subject/task/settings/Pomodoro actions, React Query keys, navbar/profile reads, and route revalidation.

## Stories and acceptance

1. A subject's name, grade, units, or deletion appears in its workspace, semester, dashboard, analytics, and task subject choices after navigation without manual reload.
2. Task changes and focus-session saves update affected task counts, daily totals, and analytics. Recurring completion remains exactly-once under spec 05.
3. A profile name change appears in settings and navigation. Failed mutations preserve existing data and do not report success.

## Plan and tests

- Write the actual mutation-to-view dependency table before editing. Invalidate only affected server paths and browser keys. Account for deleted subjects/semesters and cascading relationships.
- Real E2E first visits dependent pages to populate caches, performs a mutation, revisits each page, and checks hand-derived results. Include browser back/forward and failed writes.
- Mutation: remove one necessary invalidation and observe the populated-cache scenario fail. Avoid abstractions unless repetition in the final implementation warrants them.

Exit: all stories verified with warm caches, not only cold page loads.
