import assert from "node:assert/strict"
import { localRuntime } from "./runtime.ts"
import { localSQL, adoptLocalBaseline, applyLocalMigrations } from "./migrations.ts"
import { randomUUID } from "node:crypto"
import { mkdir, writeFile, readFile } from "node:fs/promises"
import { execFileSync } from "node:child_process"

async function main() {
  localRuntime()
  assert.equal(localSQL("SELECT to_regprocedure('public.complete_recurring_task(uuid,date)') IS NOT NULL"), "t", "Atomic recurrence RPC must exist")
  assert.equal(localSQL("SELECT NOT has_function_privilege('anon','public.complete_recurring_task(uuid,date)','EXECUTE') AND has_function_privilege('authenticated','public.complete_recurring_task(uuid,date)','EXECUTE') AND NOT has_table_privilege('authenticated','public.task_completions','INSERT')"), "t", "RPC and history privileges")
  const owner = randomUUID(), foreign = randomUUID()
  const auth = `SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${owner}',true);`
  const ids = Array.from({ length: 10 }, () => randomUUID())
  const check = (condition: string, label: string) => `DO $$ BEGIN IF NOT (${condition}) THEN RAISE EXCEPTION '${label}'; END IF; END $$;`
  let phase = "rollover and isolation"
  try {
    const capture = localSQL(`BEGIN;
      INSERT INTO auth.users(id,raw_user_meta_data) VALUES('${owner}','{}'),('${foreign}','{}');
      INSERT INTO public.task_series(id,user_id,title,recurrence_type,start_date) VALUES
        ('${ids[0]}','${owner}','database verification','daily','2030-01-01'),
        ('${ids[2]}','${owner}','database verification','weekly','2030-01-01'),
        ('${ids[4]}','${owner}','database verification','monthly','2030-01-31'),
        ('${ids[6]}','${owner}','database verification','weekdays','2030-01-04');
      INSERT INTO public.tasks(id,user_id,title,series_id,due_date) VALUES
        ('${ids[1]}','${owner}','database verification','${ids[0]}','2030-01-01'),
        ('${ids[3]}','${owner}','database verification','${ids[2]}','2030-01-01'),
        ('${ids[5]}','${owner}','database verification','${ids[4]}','2030-01-31'),
        ('${ids[7]}','${owner}','database verification','${ids[6]}','2030-01-04');
      ${auth}
      SELECT public.complete_recurring_task('${ids[1]}','2030-01-01');
      SELECT public.complete_recurring_task('${ids[3]}','2030-01-01');
      SELECT public.complete_recurring_task('${ids[5]}','2030-01-31');
      SELECT public.complete_recurring_task('${ids[7]}','2030-01-04');
      ${check(`(SELECT due_date = '2030-01-02' AND status = 'todo' FROM public.tasks WHERE id='${ids[1]}')`, "daily rollover")}
      ${check(`(SELECT due_date = '2030-01-08' FROM public.tasks WHERE id='${ids[3]}')`, "weekly rollover")}
      ${check(`(SELECT due_date = '2030-03-31' FROM public.tasks WHERE id='${ids[5]}')`, "monthly rollover")}
      ${check(`(SELECT due_date = '2030-01-07' FROM public.tasks WHERE id='${ids[7]}')`, "weekday rollover")}
      SELECT public.complete_recurring_task('${ids[1]}','2030-01-01');
      ${check("(SELECT count(*) = 4 FROM public.task_completions)", "replay inserted duplicate")}
      DO $$ BEGIN
        BEGIN UPDATE public.tasks SET status='done' WHERE id='${ids[1]}'; RAISE EXCEPTION 'direct completion allowed'; EXCEPTION WHEN check_violation THEN NULL; END;
        BEGIN UPDATE public.tasks SET series_id=NULL,status='done' WHERE id='${ids[1]}'; RAISE EXCEPTION 'direct detachment allowed'; EXCEPTION WHEN check_violation THEN NULL; END;
        BEGIN UPDATE public.tasks SET due_date='2030-01-01' WHERE id='${ids[1]}'; RAISE EXCEPTION 'completed date restored'; EXCEPTION WHEN check_violation THEN NULL; END;
      END $$;
      DO $$ BEGIN
        BEGIN INSERT INTO public.task_completions(user_id,occurrence_date) VALUES('${owner}','2030-01-01'); RAISE EXCEPTION 'direct write allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
      END $$;
      SELECT set_config('request.jwt.claim.sub','${foreign}',true);
      ${check("(SELECT count(*) = 0 FROM public.task_completions)", "foreign history visible")}
      DO $$ BEGIN
        BEGIN PERFORM public.complete_recurring_task('${ids[1]}','2030-01-02'); RAISE EXCEPTION 'foreign completion allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
      END $$;
      RESET ROLE;
      SELECT set_config('request.jwt.claim.sub','${owner}',true);
      CREATE FUNCTION public.akadex_test_fail_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced event failure'; END $$;
      CREATE TRIGGER akadex_test_fail_event AFTER INSERT ON public.task_completions FOR EACH ROW EXECUTE FUNCTION public.akadex_test_fail_event();
      SET LOCAL ROLE authenticated;
      DO $$ BEGIN
        BEGIN PERFORM public.complete_recurring_task('${ids[1]}','2030-01-02'); EXCEPTION WHEN raise_exception THEN NULL; END;
      END $$;
      ${check(`(SELECT due_date = '2030-01-02' FROM public.tasks WHERE id='${ids[1]}') AND (SELECT count(*) = 4 FROM public.task_completions)`, "rollback failed")}
      RESET ROLE;
      SELECT 'CAPTURE:' || json_build_object('occurrence_date',occurrence_date,'completed_at',completed_at)::text FROM public.task_completions WHERE task_id='${ids[1]}';
      SET LOCAL ROLE authenticated;
      DELETE FROM public.tasks WHERE id='${ids[1]}';
      ${check("(SELECT count(*) = 4 FROM public.task_completions) AND (SELECT count(*) = 1 FROM public.task_completions WHERE task_id IS NULL)", "task deletion erased history")}
      ROLLBACK;`)
    const payload = capture.split(/\r?\n/).find((line) => line.startsWith("CAPTURE:"))?.slice(8)
    assert.ok(payload, "Missing captured completion event")
    await mkdir("e2e/.cache", { recursive: true })
    await writeFile("e2e/.cache/recurrence-event.json", payload)
    phase = "fresh and upgrade migration verification"
    const authSchema = execFileSync("docker", ["exec", "supabase_db_akadex-e2e", "pg_dump", "-U", "postgres", "--schema-only", "--schema=auth", "--no-owner", "--no-privileges", "postgres"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).replace(/^CREATE TRIGGER on_auth_user_created.*\r?\n/gm, "")
    const baseline = await readFile("supabase/migrations/20261120000000_baseline.sql", "utf8")
    const timezone = await readFile("supabase/migrations/20261121000000_profile_timezone.sql", "utf8")
    const history = await readFile("supabase/migrations/20261121010000_recurring_completions.sql", "utf8")
    const guards = await readFile("supabase/migrations/20261121020000_guard_recurring_edits.sql", "utf8")
    const search = await readFile("supabase/migrations/20261121040000_search_tasks.sql", "utf8")
    const analytics = await readFile("supabase/migrations/20261121050000_analytics_aggregates.sql", "utf8")
    const ownership = await readFile("supabase/migrations/20261121060000_owned_parent_links.sql", "utf8")
    for (const upgrade of [false, true]) {
      const database = `akadex_migration_${randomUUID().replaceAll("-", "").slice(0, 12)}`
      let created = false
      try {
        localSQL(`CREATE DATABASE ${database}`); created = true
        localSQL(authSchema, database)
        localSQL(baseline + timezone, database)
        if (upgrade) localSQL(`INSERT INTO auth.users(id,raw_user_meta_data) VALUES('${owner}','{}'); INSERT INTO public.tasks(id,user_id,title,status,completed_at) VALUES('${ids[9]}','${owner}','representative existing completion','done','2026-11-20T12:00:00Z');`, database)
        localSQL(history + guards + search + analytics, database)
        if(upgrade){
          localSQL(`INSERT INTO auth.users(id,raw_user_meta_data) VALUES('${foreign}','{}');INSERT INTO public.semesters(id,user_id,title) VALUES('${ids[0]}','${foreign}','legacy foreign parent');INSERT INTO public.subjects(id,user_id,semester_id,subject_code,subject_name,units) VALUES('${ids[1]}','${owner}','${ids[0]}','LEGACY','legacy foreign child',3);`,database)
          assert.throws(()=>localSQL(ownership,database),Error,'Incompatible legacy ownership must be refused')
          assert.equal(localSQL(`SELECT count(*) FROM public.subjects WHERE id='${ids[1]}'`,database),'1','Refusal must preserve existing data')
          localSQL(`DELETE FROM public.subjects WHERE id='${ids[1]}';DELETE FROM public.semesters WHERE id='${ids[0]}';DELETE FROM auth.users WHERE id='${foreign}'`,database)
        }
        localSQL(ownership,database)
        const sem=randomUUID(),sub=randomUUID(),series=randomUUID(),linkedTask=randomUUID()
        const fixtureOwner=upgrade?owner:foreign
        if(!upgrade)localSQL(`INSERT INTO auth.users(id,raw_user_meta_data) VALUES('${fixtureOwner}','{}')`,database)
        localSQL(`INSERT INTO public.semesters(id,user_id,title) VALUES('${sem}','${fixtureOwner}','cascade verification');INSERT INTO public.subjects(id,user_id,semester_id,subject_code,subject_name,units) VALUES('${sub}','${fixtureOwner}','${sem}','OWN','owned subject',3);INSERT INTO public.task_series(id,user_id,subject_id,title,recurrence_type,start_date) VALUES('${series}','${fixtureOwner}','${sub}','owned series','daily','2030-01-01');INSERT INTO public.tasks(id,user_id,subject_id,series_id,title,due_date) VALUES('${linkedTask}','${fixtureOwner}','${sub}','${series}','owned task','2030-01-01');DELETE FROM public.semesters WHERE id='${sem}';`,database)
        assert.equal(localSQL(`SELECT (SELECT count(*)=0 FROM public.subjects WHERE id='${sub}') AND (SELECT subject_id IS NULL AND user_id='${fixtureOwner}' FROM public.tasks WHERE id='${linkedTask}') AND (SELECT subject_id IS NULL AND user_id='${fixtureOwner}' FROM public.task_series WHERE id='${series}')`,database),'t','Owner-aware links must preserve cascade/set-null behavior')
        assert.equal(localSQL("SELECT bool_and(NOT prosecdef AND NOT has_function_privilege('anon',oid,'EXECUTE') AND has_function_privilege('authenticated',oid,'EXECUTE')) FROM pg_proc WHERE oid IN ('public.activity_report(date,text,text)'::regprocedure,'public.focus_summary(timestamptz,timestamptz)'::regprocedure,'public.semester_task_counts(uuid)'::regprocedure)",database),"t","Aggregate functions retain invoker permissions")
        assert.equal(localSQL("SELECT NOT prosecdef AND NOT has_function_privilege('anon',oid,'EXECUTE') AND has_function_privilege('authenticated',oid,'EXECUTE') FROM pg_proc WHERE oid='public.search_tasks(text,public.task_status,uuid,public.task_priority)'::regprocedure", database), "t", "Read-only search must retain invoker privileges")
        assert.equal(localSQL("SELECT to_regprocedure('public.complete_recurring_task(uuid,date)') IS NOT NULL AND (SELECT count(*) = 0 FROM public.task_completions)", database), "t", "Fresh schema/history contract")
        if (upgrade) assert.equal(localSQL(`SELECT title = 'representative existing completion' AND completed_at = '2026-11-20T12:00:00Z' FROM public.tasks WHERE id='${ids[9]}'`, database), "t", "Upgrade must preserve representative rows")
      } finally { if (created) localSQL(`DROP DATABASE ${database} WITH (FORCE)`) }
    }
    phase = "migration ledger and unknown-baseline rejection"
    const before = localSQL("SELECT string_agg(version,',' ORDER BY version) FROM supabase_migrations.schema_migrations")
    await assert.rejects(adoptLocalBaseline, /Schema differs/)
    await applyLocalMigrations()
    assert.equal(localSQL("SELECT string_agg(version,',' ORDER BY version) FROM supabase_migrations.schema_migrations"), before, "Repeat migration must preserve ledger")
    console.info("Verified daily/weekly/monthly/weekday rollover, replay, rollback, history isolation, and fresh/upgrade migrations. Test databases removed.")
  } catch {
    throw new Error(`Recurrence verification failed during ${phase}; private database diagnostics suppressed.`)
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1 })
