import { authState } from "./ci-auth.ts"
import { test,expect } from '@playwright/test'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { mkdir,writeFile } from 'node:fs/promises'
import { localRuntime } from './runtime.ts'
import { localSQL } from './migrations.ts'

test('spec10: direct permitted APIs isolate rows and reject foreign parent links',async({browser})=>{
  const contexts=await Promise.all((['a','b'] as const).map(account=>browser.newContext({storageState:authState(account)})))
  const {env}=localRuntime(),url=env.NEXT_PUBLIC_SUPABASE_URL!,key=env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  const ids=Array.from({length:16},()=>randomUUID()),marker=`E2E-isolation-${randomUUID()}`
  let checks=0,passed=false
  try{
    for(const context of contexts){const page=await context.newPage();await page.goto('/pomodoro');await expect(page.getByRole('button',{name:'Start',exact:true})).toBeEnabled()}
    const clients=contexts.map(context=>createServerClient(url,key,{cookies:{getAll:()=>context.cookies()}}))
    const users=await Promise.all(clients.map(async client=>(await client.auth.getUser()).data.user?.id))
    if(!users[0]||!users[1]||users[0]===users[1])throw Error('Two distinct manual local sessions are required.')
    const [a,b]=users,[actorA,actorB]=clients
    localSQL(`INSERT INTO public.semesters(id,user_id,title) VALUES('${ids[0]}','${a}','${marker}'),('${ids[1]}','${b}','${marker}');
      INSERT INTO public.subjects(id,user_id,semester_id,subject_code,subject_name,units) VALUES('${ids[2]}','${a}','${ids[0]}','ISO','${marker}',3),('${ids[3]}','${b}','${ids[1]}','ISO','${marker}',3);
      INSERT INTO public.task_series(id,user_id,subject_id,title,recurrence_type,start_date) VALUES('${ids[4]}','${a}','${ids[2]}','${marker}','daily','2030-01-01'),('${ids[5]}','${b}','${ids[3]}','${marker}','daily','2030-01-01');
      INSERT INTO public.tasks(id,user_id,subject_id,series_id,title,due_date) VALUES('${ids[6]}','${a}','${ids[2]}','${ids[4]}','${marker}','2030-01-01'),('${ids[7]}','${b}','${ids[3]}','${ids[5]}','${marker}','2030-01-01');
      INSERT INTO public.pomodoro_sessions(id,user_id,duration,completed) VALUES('${ids[8]}','${a}',60,true),('${ids[9]}','${b}',60,true);`)
    for(let i=0;i<2;i++){const result=await clients[i].rpc('complete_recurring_task',{p_task_id:ids[6+i],p_occurrence_date:'2030-01-01'});expect(Boolean(result.error),'owner completion permitted').toBe(false);checks++}
    const events=await Promise.all(clients.map(async(client,i)=>{const result=await client.from('task_completions').select('id').eq('task_id',ids[6+i]).single();if(result.error||!result.data)throw Error('Owner completion fixture unavailable.');return result.data.id as string}))
    const tables=[['semesters',ids[0],ids[1],'title'],['subjects',ids[2],ids[3],'subject_name'],['task_series',ids[4],ids[5],'title'],['tasks',ids[6],ids[7],'title'],['pomodoro_sessions',ids[8],ids[9],'duration'],['task_completions',events[0],events[1],'completed_at']] as const
    const anonymous=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
    for(const [table,foreign,owned,field] of tables){
      const read=await actorB.from(table).select('id').eq('id',foreign)
      expect(read.data?.length??0,`${table}: foreign read`).toBe(0);checks++
      const own=await actorB.from(table).select('id').eq('id',owned)
      expect(own.data?.length,`${table}: own read`).toBe(1);checks++
      const update=await actorB.from(table).update({[field]:field==='duration'?120:field==='completed_at'?'2030-01-01Z':'hijack'}).eq('id',foreign).select('id')
      expect(update.data?.length??0,`${table}: foreign update`).toBe(0);checks++
      const deleted=await actorB.from(table).delete().eq('id',foreign).select('id')
      expect(deleted.data?.length??0,`${table}: foreign delete`).toBe(0);checks++
      const transfer=await actorB.from(table).update({user_id:a}).eq('id',owned).select('id')
      expect(Boolean(transfer.error),`${table}: owner transfer`).toBe(true);checks++
      const anon=await anonymous.from(table).select('id').eq('id',foreign)
      expect(anon.data?.length??0,`${table}: anonymous read`).toBe(0);checks++
    }
    const legitimate=await actorB.from('subjects').update({subject_name:`${marker}-updated`}).eq('id',ids[3]).select('id')
    expect(legitimate.data?.length,'legitimate owner update').toBe(1);checks++
    const attempts=[
      ()=>actorB.from('subjects').insert({id:ids[10],user_id:b,semester_id:ids[0],subject_code:'BAD',subject_name:marker,units:3}),
      ()=>actorB.from('subjects').update({semester_id:ids[0]}).eq('id',ids[3]),
      ()=>actorB.from('tasks').insert({id:ids[11],user_id:b,subject_id:ids[2],title:marker}),
      ()=>actorB.from('tasks').update({subject_id:ids[2]}).eq('id',ids[7]),
      ()=>actorB.from('task_series').insert({id:ids[12],user_id:b,subject_id:ids[2],title:marker,recurrence_type:'daily',start_date:'2030-01-01'}),
      ()=>actorB.from('task_series').update({subject_id:ids[2]}).eq('id',ids[5]),
      ()=>actorB.from('tasks').insert({id:ids[13],user_id:b,series_id:ids[4],title:marker,due_date:'2030-01-01'}),
      ()=>actorB.from('task_completions').insert({user_id:b,task_id:ids[6],series_id:ids[4],occurrence_date:'2030-01-01'}),
      ()=>actorB.rpc('complete_recurring_task',{p_task_id:ids[6],p_occurrence_date:'2030-01-02'}),
      ()=>anonymous.from('tasks').insert({user_id:a,title:marker}),
    ]
    const accepted:number[]=[]
    for(const [index,attempt] of attempts.entries()){const result=await attempt();if(!result.error)accepted.push(index+1);checks++}
    expect(accepted,'foreign parent/unauthorized writes must all be rejected').toEqual([])
    const preserved=await actorA.from('subjects').select('subject_name').eq('id',ids[2]).single()
    expect(preserved.data?.subject_name,'foreign original preserved').toBe(marker);checks++
    passed=true
  }finally{
    localSQL(`DELETE FROM public.task_completions WHERE series_id IN ('${ids[4]}','${ids[5]}');DELETE FROM public.tasks WHERE id IN (${ids.map(id=>`'${id}'`).join(',')});DELETE FROM public.task_series WHERE id IN (${ids.map(id=>`'${id}'`).join(',')});DELETE FROM public.subjects WHERE id IN (${ids.map(id=>`'${id}'`).join(',')});DELETE FROM public.semesters WHERE id IN ('${ids[0]}','${ids[1]}');DELETE FROM public.pomodoro_sessions WHERE id IN ('${ids[8]}','${ids[9]}')`)
    await Promise.all(contexts.map(context=>context.close()))
    await mkdir('e2e/.cache',{recursive:true});await writeFile('e2e/.cache/isolation-summary.json',JSON.stringify({version:1,passed,checks,tables:6,cleanup:true})+'\n')
  }
})
