# Captured baseline data

`baseline-data.json` is an actual PostgreSQL JSON response captured on 2026-11-20 from the isolated `supabase_db_akadex-e2e` container during the real browser baseline scenario. The browser created the records through Akadex's existing UI and server actions.

The capture query selected only subject `units`/`grade` and task `status` for the suite's generated `E2E-` records. No identifiers, names, descriptions, email addresses, cookies, or tokens were captured. This is a database response fixture, not a fabricated Supabase HTTP protocol response.

Expected values were hand-derived before capture: `(3 × 2 + 1 × 1) / 4 = 1.75` GWA, four graded units, six active tasks and two completed tasks. Do not regenerate expectations using application calculation helpers.
