# Database migration contract

`migrations/20261120000000_baseline.sql` freezes the application schema through spec 04. Later versioned files are applied by the Supabase migration ledger. `schema.sql` is the current reference, not a seed to replay during upgrades.

For a new isolated local project, `npm run e2e:db` starts Supabase and applies versioned migrations. Canonical-schema seeding is disabled.

For the already-running pre-spec05 local project, first run `npm run e2e:adopt-baseline`. It checks the public schema-only dump against the captured fingerprint in `baseline.json`, then registers the baseline and included timezone version without replaying DDL or rows. A different schema is refused. Review differences explicitly rather than replacing the fingerprint to force adoption. Once adopted, `npm run e2e:db` applies only pending migrations; repeated runs leave the ledger unchanged.

`npm run e2e:verify-db` verifies recurrence/RLS/grants/rollback, loads the real auth schema and versioned SQL into two disposable local databases, tests fresh provisioning and preservation of representative existing rows, removes both databases, and checks repeat application and baseline refusal. It uses only the dedicated `supabase_db_akadex-e2e` container. It never resets the live test database or copies account credentials.

The baseline fingerprint captures the specific verified local schema, not every historical hosted deployment. Before a hosted rollout, compare that deployment's schema and ledger, establish its baseline deliberately, and apply the pending migrations before deploying the application. No hosted database was accessed or migrated during this implementation. Never use these local commands as a hosted-adoption shortcut.

CI authentication and the remaining release/isolation gates are still part of spec 10.

Spec 10 adds `20261121060000_owned_parent_links.sql` for ownership-aware subject/semester and task/series subject links. It first refuses existing cross-account links without changing those rows, then validates composite foreign keys before dropping the older single-column keys. Null relationships and cascade/set-null behavior are preserved. Local fresh/upgrade tests also prove incompatible legacy data is refused and retained. The migration was tested on local PostgreSQL 17; no hosted project was migrated. Review any refused legacy links explicitly before retrying, rather than disabling the checks.
