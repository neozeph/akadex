import { authState } from "./ci-auth.ts"
import { test, expect, type Page } from "@playwright/test"
import { randomUUID } from "node:crypto"
import { localSQL } from "./migrations.ts"

async function owner(page:Page){
  await page.goto('/pomodoro')
  await expect(page.getByRole('button',{name:'Start',exact:true})).toBeEnabled()
  return page.evaluate(()=>{
    const key=Object.keys(localStorage).find(key=>key.startsWith('akadex:pomodoro-timer:'))!
    return JSON.parse(localStorage.getItem(key)!).userId as string
  })
}

test('spec08 S1/S2: large histories, ranges and grouped semester counts stay accurate',async({browser})=>{
  const context=await browser.newContext({storageState:authState('a')}),page=await context.newPage()
  const semester=randomUUID(),subject=randomUUID(),marker=`E2E-aggregate-${randomUUID()}`
  let user=''
  try{
    user=await owner(page)
    const today=localSQL(`SELECT (now() AT TIME ZONE timezone)::date FROM public.profiles WHERE id='${user}'`)
    localSQL(`INSERT INTO public.semesters(id,user_id,title,school_year) VALUES('${semester}','${user}','${marker}','2030-2031');
      INSERT INTO public.subjects(id,user_id,semester_id,subject_code,subject_name,units,grade) VALUES('${subject}','${user}','${semester}','AGG','${marker}',3,1.5);
      INSERT INTO public.tasks(user_id,subject_id,title,due_date) SELECT '${user}','${subject}','${marker}','${today}'::date-1 FROM generate_series(1,1102);
      INSERT INTO public.tasks(user_id,title,status,completed_at) SELECT '${user}','${marker}','done',now() FROM generate_series(1,1103);
      INSERT INTO public.tasks(user_id,title,status,completed_at) VALUES('${user}','${marker}','done',now()-interval '15 days'),('${user}','${marker}','done',now()-interval '45 days');
      INSERT INTO public.pomodoro_sessions(user_id,duration,completed,started_at,ended_at,completion_id) SELECT '${user}',60,true,now()-interval '1 minute',now(),md5('${marker}'||n)::uuid FROM generate_series(1,1101) n;`)
    for(const [range,count] of [['7d','1103'],['30d','1104'],['all','1105']] as const){
      await page.goto(`/analytics?range=${range}`)
      const section=page.locator('section').filter({has:page.getByRole('heading',{name:'Task Activity',exact:true})}).last()
      await expect(section.locator('dd').nth(0)).toHaveText(count)
      await expect(section.locator('dd').nth(1)).toHaveText('1102')
      await expect(section.locator('dd').nth(2)).toHaveText('1102')
      const focus=page.locator('div').filter({has:page.getByRole('heading',{name:'Focus Activity',exact:true})}).last()
      await expect(focus.locator('dd').nth(1)).toHaveText('1101')
    }
    // Exceed the service cap on GROUPS as well as on tasks within one group.
    localSQL(`INSERT INTO public.subjects(id,user_id,semester_id,subject_code,subject_name,units)
      SELECT md5('${marker}'||n)::uuid,'${user}','${semester}','AGG'||n,'${marker}',3 FROM generate_series(1,1001) n;
      INSERT INTO public.tasks(user_id,subject_id,title) SELECT '${user}',id,'${marker}' FROM public.subjects WHERE semester_id='${semester}' AND id<>'${subject}';`)
    await page.goto(`/semesters/${semester}`)
    await expect(page.getByText('2103',{exact:true}).first()).toBeVisible()
    await expect(page.getByText('1002',{exact:true}).first()).toBeVisible()
    const other=await browser.newContext({storageState:authState('b')})
    try{const foreign=await other.newPage();await foreign.goto(`/semesters/${semester}`);await expect(foreign).toHaveURL(/\/semesters$/);await expect(foreign.getByText(marker,{exact:true})).toHaveCount(0)}finally{await other.close()}
    await page.goto('/dashboard')
    const focusToday=page.getByRole('main').getByRole('article').filter({has:page.getByText('Focus today',{exact:true})})
    await expect(focusToday).toHaveCount(1)
    await expect(focusToday.getByText('1101 sessions logged',{exact:true})).toBeVisible()
  }finally{
    if(user)localSQL(`DELETE FROM public.pomodoro_sessions WHERE user_id='${user}' AND completion_id IN (SELECT md5('${marker}'||n)::uuid FROM generate_series(1,1101) n);DELETE FROM public.tasks WHERE title='${marker}';DELETE FROM public.semesters WHERE id='${semester}'`)
    await context.close()
  }
})

test('spec08 S3: delayed and failed activity leaves academic content usable',async({browser})=>{
  const context=await browser.newContext({storageState:authState('a')}),page=await context.newPage()
  const original=localSQL("SELECT pg_get_functiondef('public.activity_report(date,text,text)'::regprocedure)")
  try{
    await owner(page)
    localSQL(original.replace('begin\n',"begin\n  perform pg_sleep(4);\n"))
    // Inspect the document while the delayed Suspense segment is still streaming.
    await page.goto('/analytics',{waitUntil:'commit'})
    await expect(page.getByText('No academic data yet.',{exact:true}).filter({visible:true})).toBeVisible({timeout:2000})
    await expect(page.getByText('Loading study activity...', {exact:true}).filter({visible:true})).toBeVisible()
    await expect(page.getByRole('heading',{name:'Task Activity',exact:true})).toBeVisible({timeout:10000})
    localSQL(original)
    localSQL('REVOKE SELECT ON public.pomodoro_sessions FROM authenticated')
    await page.reload()
    await expect(page.getByText('No academic data yet.',{exact:true}).filter({visible:true})).toBeVisible()
    await expect(page.getByText('Unable to load study activity.',{exact:true})).toBeVisible()
    localSQL('GRANT SELECT ON public.pomodoro_sessions TO authenticated')
    await page.getByRole('link',{name:'Retry study activity',exact:true}).click()
    await expect(page.getByRole('heading',{name:'Task Activity',exact:true})).toBeVisible()
  }finally{
    localSQL(original);localSQL('GRANT SELECT ON public.pomodoro_sessions TO authenticated')
    await context.close()
  }
})
