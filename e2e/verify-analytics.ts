import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import { localSQL } from "./migrations.ts"
import { localRuntime } from "./runtime.ts"

localRuntime()
const owner=randomUUID(),other=randomUUID(),subject=randomUUID(),semester=randomUUID(),task=randomUUID()
// Everything is rolled back, including users. These are not login credentials.
const setup=`INSERT INTO auth.users(id,raw_user_meta_data) VALUES('${owner}','{}'),('${other}','{}');
INSERT INTO public.semesters(id,user_id,title,school_year) VALUES('${semester}','${owner}','aggregate check','2030-2031');
INSERT INTO public.subjects(id,user_id,semester_id,subject_code,subject_name,units) VALUES('${subject}','${owner}','${semester}','AGG','Aggregate',3);
INSERT INTO public.tasks(user_id,title,status,completed_at) SELECT '${owner}','history','done','2030-01-01T16:00:00Z' FROM generate_series(1,1103);
INSERT INTO public.tasks(id,user_id,title,status,due_date,completed_at) VALUES('${task}','${owner}','event duplicate','done','2030-01-02','2030-01-01T16:00:00Z');
INSERT INTO public.task_completions(user_id,task_id,occurrence_date,completed_at) VALUES('${owner}','${task}','2030-01-02','2030-01-01T16:00:00Z');
INSERT INTO public.tasks(user_id,title,status,completed_at) VALUES('${owner}','old','done','2029-12-01Z'),('${owner}','future','done','2030-01-03Z'),('${owner}','undated','done',null),('${other}','foreign','done','2030-01-02Z');
INSERT INTO public.tasks(user_id,subject_id,title,due_date) SELECT '${owner}','${subject}','active','2030-01-01' FROM generate_series(1,1102);
INSERT INTO public.pomodoro_sessions(user_id,duration,completed,started_at,ended_at) SELECT '${owner}',60,true,'2030-01-01T15:59Z','2030-01-01T16:00Z' FROM generate_series(1,1101);`
const auth=`SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${owner}',true);`
const rpc=`public.activity_report('2030-01-02','Asia/Manila','7d')`
try{
  const raw=localSQL(`BEGIN;${setup}${auth}SELECT ${rpc};ROLLBACK;`)
  const report=JSON.parse(raw.split(/\r?\n/).find((line)=>line.startsWith('{'))!)
  assert.equal(report.completedCount,1104)
  assert.equal(report.activeNow,1102);assert.equal(report.overdueNow,1102)
  assert.equal(report.legacyUndatedCompletionCount,1)
  assert.equal(report.completedSessionCount,1101);assert.equal(report.focusTimeSeconds,66060)
  assert.equal(report.taskDays[0].dateISO,'2030-01-02')
  const all=localSQL(`BEGIN;${setup}${auth}SELECT public.activity_report('2030-01-02','Asia/Manila','all')->>'completedCount';ROLLBACK;`)
  assert.ok(all.split(/\r?\n/).includes('1105'))
  const empty=localSQL(`BEGIN;SET LOCAL ROLE authenticated;SELECT set_config('request.jwt.claim.sub','${randomUUID()}',true);SELECT public.activity_report('2030-01-02','Asia/Manila','30d');ROLLBACK;`)
  const emptyReport=JSON.parse(empty.split(/\r?\n/).find(line=>line.startsWith('{'))!)
  assert.equal(emptyReport.completedCount,0);assert.equal(emptyReport.focusTimeSeconds,0)
  const foreignActivity=localSQL(`BEGIN;${setup}SET LOCAL ROLE authenticated;SELECT set_config('request.jwt.claim.sub','${other}',true);SELECT public.activity_report('2030-01-02','Asia/Manila','30d');ROLLBACK;`)
  const one=JSON.parse(foreignActivity.split(/\r?\n/).find(line=>line.startsWith('{'))!)
  assert.equal(one.completedCount,1);assert.equal(one.activeNow,0);assert.equal(one.completedSessionCount,0)
  const counts=localSQL(`BEGIN;${setup}${auth}SELECT active_count FROM public.semester_task_counts('${semester}');ROLLBACK;`)
  assert.ok(counts.split(/\r?\n/).includes('1102'))
  const foreign=localSQL(`BEGIN;${setup}SET LOCAL ROLE authenticated;SELECT set_config('request.jwt.claim.sub','${other}',true);SELECT count(*) FROM public.semester_task_counts('${semester}');ROLLBACK;`)
  assert.ok(foreign.split(/\r?\n/).includes('0'))
  const output=process.env.AKADEX_CAPTURE_ANALYTICS==='1'?'docs/specs/results':'e2e/.cache/analytics'
  await mkdir(`${output}/fixtures`,{recursive:true})
  await writeFile(`${output}/fixtures/08-activity-report.json`,JSON.stringify(report,null,2)+'\n')
  const plan=localSQL(`BEGIN;${setup}${auth}EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) SELECT completed_at FROM public.tasks WHERE user_id=auth.uid() AND status='done' AND completed_at >= '2030-01-01T16:00Z' AND completed_at < '2030-01-02T16:00Z';ROLLBACK;`)
  const sanitized=plan.slice(plan.indexOf('['),plan.lastIndexOf(']')+1).replaceAll(owner,'fixture-owner')
  await writeFile(`${output}/08-query-plan.txt`,sanitized+'\n')
  const payload=localSQL(`BEGIN;${setup}${auth}SELECT json_build_object(
    'taskRows', (SELECT count(*) FROM public.tasks),
    'sessionRows',(SELECT count(*) FROM public.pomodoro_sessions),
    'rawHistoryBytes',octet_length((SELECT json_agg(r)::text FROM (SELECT id,status,due_date,completed_at FROM public.tasks) r)) + octet_length((SELECT json_agg(r)::text FROM (SELECT id,duration,ended_at FROM public.pomodoro_sessions WHERE completed) r)) + octet_length((SELECT json_agg(r)::text FROM (SELECT id,task_id,occurrence_date,completed_at FROM public.task_completions) r)),
    'aggregateBytes',octet_length(${rpc}::text));ROLLBACK;`)
  const measurement=JSON.parse(payload.split(/\r?\n/).find(line=>line.startsWith('{'))!)
  const plans:{kind:string;executionMs:number}[]=[]
  for(const [kind,query] of [['raw-task-projection',"SELECT id,status,due_date,completed_at FROM public.tasks WHERE user_id=auth.uid()"],['activity-aggregate',`SELECT ${rpc}`]]){
    for(let i=0;i<5;i++){
      const rawPlan=localSQL(`BEGIN;${setup}${auth}EXPLAIN(ANALYZE,FORMAT JSON) ${query};ROLLBACK;`)
      const parsed=JSON.parse(rawPlan.slice(rawPlan.indexOf('['),rawPlan.lastIndexOf(']')+1))
      plans.push({kind,executionMs:parsed[0]['Execution Time']})
    }
  }
  await writeFile(`${output}/08-measurements.json`,JSON.stringify({...measurement,plans,note:'Raw history bytes use complete projections, not the old truncated 1000-row API response. SQL timings exclude transport/browser work; raw task projection excludes focus/event reads. Five transaction-isolated samples each.'},null,2)+'\n')
  console.log('Analytics SQL: large histories, timezone bounds, deduplication, current counts, grouped counts and ownership passed; transactions rolled back.')
}catch(error){
  const stderr=(error as {stderr?:string}).stderr
  if(stderr) console.error(String(stderr).split(/\r?\n/).filter((line)=>line.startsWith('ERROR:')).join('\n'))
  else console.error(error instanceof Error?error.message:'Assertion failed')
  throw new Error('Analytics SQL verification failed (private SQL omitted).')
}
