import { authState } from "./ci-auth.ts"
import { test,expect,type Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { localSQL } from './migrations.ts'
test.use({actionTimeout:10000})

async function owner(page:Page){
  await page.goto('/pomodoro');await expect(page.getByRole('button',{name:'Start',exact:true})).toBeEnabled()
  const id=await page.evaluate(()=>{const key=Object.keys(localStorage).find(key=>key.startsWith('akadex:pomodoro-timer:'))!;return JSON.parse(localStorage.getItem(key)!).userId as string})
  if(!/^[a-f0-9-]{36}$/i.test(id))throw Error('Invalid fixture account')
  return id
}
async function nav(page:Page,name:string){
  await page.getByRole('link',{name,exact:true}).filter({visible:true}).first().click()
  await expect(page).toHaveURL(new RegExp(`/${name==='Focus'?'pomodoro':name.toLowerCase()}$`))
}
async function semesterPage(page:Page,id:string){await nav(page,'Semesters');await page.locator(`a[href="/semesters/${id}"]`).first().click();await expect(page).toHaveURL(new RegExp(`/semesters/${id}$`))}
async function subjectPage(page:Page,semester:string,subject:string){await semesterPage(page,semester);await page.locator(`a[href="/semesters/${semester}/subjects/${subject}"]`).click()}

test('spec09 S1: warm subject edits and deletion update every dependent view and cached task embeds',async({browser})=>{
  const context=await browser.newContext({storageState:authState('a')}),page=await context.newPage()
  const semester=randomUUID(),subject=randomUUID(),second=randomUUID(),task=randomUUID(),marker=`E2E-warm-${randomUUID()}`
  try{
    const user=await owner(page)
    localSQL(`INSERT INTO public.semesters(id,user_id,title,school_year) VALUES('${semester}','${user}','${marker}','2030-2031');
      INSERT INTO public.subjects(id,user_id,semester_id,subject_code,subject_name,units,grade) VALUES('${subject}','${user}','${semester}','OLD','${marker}',3,1),('${second}','${user}','${semester}','SECOND','${marker}-second',1,3);
      INSERT INTO public.tasks(id,user_id,subject_id,title) VALUES('${task}','${user}','${subject}','${marker}');`)
    await nav(page,'Tasks');await expect(page.getByText(`OLD · ${marker}`,{exact:true})).toBeVisible()
    await nav(page,'Dashboard');await expect(page.getByText('1.50',{exact:true}).filter({visible:true}).first()).toBeVisible()
    await nav(page,'Analytics');await expect(page.getByText('1.50',{exact:true}).filter({visible:true}).first()).toBeVisible()
    await subjectPage(page,semester,subject)
    await page.getByRole('button',{name:'Edit',exact:true}).click()
    const dialog=page.getByRole('dialog',{name:'Edit subject',exact:true})
    await dialog.locator('[name="subject_code"]').fill('NEW')
    await dialog.locator('[name="subject_name"]').fill(`${marker}-updated`)
    await dialog.locator('[name="units"]').fill('1')
    await dialog.locator('select[name="grade"]').selectOption('2.00')
    await dialog.getByRole('button',{name:'Save changes',exact:true}).click()
    await expect(dialog).toHaveCount(0)
    expect(localSQL(`SELECT grade=2 AND units=1 FROM public.subjects WHERE id='${subject}'`)).toBe('t')
    await expect(page.getByRole('heading',{name:'NEW',exact:true})).toBeVisible()
    await expect(page.getByText('2.00',{exact:true}).filter({visible:true}).first()).toBeVisible()
    await expect(page.getByText(`${marker}-updated`,{exact:true}).filter({visible:true})).toBeVisible()
    await nav(page,'Tasks');await expect(page.getByText(`NEW · ${marker}-updated`,{exact:true})).toBeVisible();await expect(page.getByText(`OLD · ${marker}`,{exact:true})).toHaveCount(0)
    await page.getByRole('button',{name:'Add Task',exact:true}).first().click()
    const newTask=page.getByRole('dialog',{name:'New task',exact:true})
    await newTask.getByLabel('Subject',{exact:true}).click()
    await expect(page.getByRole('option',{name:new RegExp(`NEW.*${marker}-updated`)})).toBeVisible()
    await page.keyboard.press('Escape');await newTask.getByRole('button',{name:'Cancel',exact:true}).click()
    await page.goBack();await page.goForward();await expect(page.getByText(`NEW · ${marker}-updated`,{exact:true})).toBeVisible()
    await nav(page,'Dashboard')
    await expect(page.getByText('2.50',{exact:true}).filter({visible:true}).first()).toBeVisible()
    await nav(page,'Analytics');await expect(page.getByText('2.50',{exact:true}).filter({visible:true}).first()).toBeVisible()
    await semesterPage(page,semester);await expect(page.getByText('2.50',{exact:true}).filter({visible:true}).first()).toBeVisible()
    await page.getByRole('button',{name:'Delete NEW',exact:true}).click()
    await page.getByRole('button',{name:'Delete subject',exact:true}).click()
    await expect(page.getByRole('button',{name:'Delete NEW',exact:true})).toHaveCount(0)
    await nav(page,'Tasks');await expect(page.getByRole('heading',{name:marker,exact:true})).toBeVisible();await expect(page.getByText(`NEW · ${marker}-updated`,{exact:true})).toHaveCount(0)
    expect(localSQL(`SELECT subject_id IS NULL FROM public.tasks WHERE id='${task}'`)).toBe('t')
    await nav(page,'Dashboard');await expect(page.getByText('3.00',{exact:true}).filter({visible:true}).first()).toBeVisible()
    await nav(page,'Analytics');await expect(page.getByText('3.00',{exact:true}).filter({visible:true}).first()).toBeVisible()
  }finally{localSQL(`DELETE FROM public.tasks WHERE id='${task}';DELETE FROM public.semesters WHERE id='${semester}'`);await context.close()}
})

test('spec09 S2: task writes outside Tasks and semester cascades invalidate warm task pages',async({browser})=>{
  const context=await browser.newContext({storageState:authState('a')}),page=await context.newPage()
  const semester=randomUUID(),subject=randomUUID(),marker=`E2E-outside-${randomUUID()}`
  try{
    const user=await owner(page)
    localSQL(`INSERT INTO public.semesters(id,user_id,title,school_year) VALUES('${semester}','${user}','${marker}','2030-2031');INSERT INTO public.subjects(id,user_id,semester_id,subject_code,subject_name,units) VALUES('${subject}','${user}','${semester}','EXTERNAL','${marker}',3)`)
    await nav(page,'Tasks');await expect(page.getByRole('heading',{name:marker,exact:true})).toHaveCount(0)
    await nav(page,'Dashboard');await nav(page,'Analytics')
    await subjectPage(page,semester,subject)
    await page.getByRole('button',{name:'Add Task',exact:true}).first().click()
    const dialog=page.getByRole('dialog',{name:'New task',exact:true})
    await dialog.getByLabel('Task title',{exact:true}).fill(marker)
    await dialog.getByRole('button',{name:'Save task',exact:true}).click();await expect(dialog).toHaveCount(0)
    await nav(page,'Tasks');await expect(page.getByRole('heading',{name:marker,exact:true})).toBeVisible()
    await subjectPage(page,semester,subject)
    await page.getByRole('checkbox',{name:`Mark ${marker} as complete`,exact:true}).locator('..').click()
    await expect.poll(()=>localSQL(`SELECT status FROM public.tasks WHERE title='${marker}'`)).toBe('done')
    await nav(page,'Tasks');await expect(page.getByRole('heading',{name:marker,exact:true})).toHaveCount(0)
    await page.getByRole('link',{name:'Done',exact:true}).click()
    await expect(page.getByText(`EXTERNAL · ${marker}`,{exact:true})).toBeVisible()
    await nav(page,'Dashboard');await expect(page.getByText('1 completed',{exact:true})).toBeVisible()
    await nav(page,'Analytics')
    const activity=page.locator('section').filter({has:page.getByRole('heading',{name:'Task Activity',exact:true})}).last()
    await expect(activity.locator('dd').first()).toHaveText('1')
    await nav(page,'Semesters');await page.getByRole('button',{name:`Delete ${marker}`,exact:true}).click()
    await page.getByRole('button',{name:'Delete semester',exact:true}).click()
    await expect(page.locator(`a[href="/semesters/${semester}"]`)).toHaveCount(0)
    await nav(page,'Tasks');await page.getByRole('link',{name:'Done',exact:true}).click()
    await expect(page.getByRole('heading',{name:marker,exact:true})).toBeVisible()
    await expect(page.getByText(`EXTERNAL · ${marker}`,{exact:true})).toHaveCount(0)
    expect(localSQL(`SELECT subject_id IS NULL FROM public.tasks WHERE title='${marker}'`)).toBe('t')
    await nav(page,'Analytics');await expect(page.getByText('No academic data yet.',{exact:true}).filter({visible:true})).toBeVisible()
  }finally{localSQL(`DELETE FROM public.tasks WHERE title='${marker}';DELETE FROM public.semesters WHERE id='${semester}'`);await context.close()}
})

test('spec09 S2 focus: a saved round refreshes warm dashboard and analytics totals',async({browser})=>{
  const context=await browser.newContext({storageState:authState('a')}),page=await context.newPage()
  let user='',original:{focus:number;break:number}|undefined,completion=''
  try{
    user=await owner(page)
    original=JSON.parse(localSQL(`SELECT json_build_object('focus',focus_duration_minutes,'break',break_duration_minutes) FROM public.profiles WHERE id='${user}'`))
    await nav(page,'Dashboard');await expect(page.getByText('0 sessions logged',{exact:true})).toBeVisible()
    await nav(page,'Analytics');await expect(page.getByRole('heading',{name:'Focus Activity',exact:true})).toBeVisible()
    await nav(page,'Pomodoro')
    await page.getByRole('button',{name:/^Focus \d+m/}).click()
    const settings=page.getByRole('dialog',{name:'Pomodoro settings',exact:true})
    await settings.getByLabel('Focus duration',{exact:true}).fill('1')
    await settings.getByRole('button',{name:'Save',exact:true}).click();await expect(settings).toBeHidden()
    await page.clock.install({time:new Date()})
    await page.getByRole('button',{name:'Start',exact:true}).click()
    completion=await page.evaluate((id)=>JSON.parse(localStorage.getItem(`akadex:pomodoro-timer:${id}`)!).snapshot.completionId,user)
    await page.clock.fastForward(60000)
    await expect.poll(()=>localSQL(`SELECT count(*) FROM public.pomodoro_sessions WHERE completion_id='${completion}'`)).toBe('1')
    await page.clock.resume()
    await nav(page,'Dashboard');await expect(page.getByText('1 sessions logged',{exact:true})).toBeVisible()
    await nav(page,'Analytics')
    const focus=page.locator('div').filter({has:page.getByRole('heading',{name:'Focus Activity',exact:true})}).last()
    await expect(focus.locator('dd').nth(1)).toHaveText('1')
    await expect(focus.locator('dd').first()).toHaveText('1m')
  }finally{
    if(completion)localSQL(`DELETE FROM public.pomodoro_sessions WHERE completion_id='${completion}'`)
    if(user&&original)localSQL(`UPDATE public.profiles SET focus_duration_minutes=${original.focus},break_duration_minutes=${original.break} WHERE id='${user}'`)
    await context.close()
  }
})

test('spec09 S3: profile edits refresh navigation and failures preserve the saved name',async({browser})=>{
  const context=await browser.newContext({storageState:authState('a')}),page=await context.newPage()
  let user='',original:string|null=null
  const first=`Warm${randomUUID().slice(0,8)}`,name=`${first} Student`
  try{
    user=await owner(page);original=localSQL(`SELECT to_json(full_name) FROM public.profiles WHERE id='${user}'`)||'null'
    await nav(page,'Settings');await nav(page,'Dashboard');await nav(page,'Settings')
    await page.locator('input[name="full_name"]').fill(name)
    await page.getByRole('button',{name:'Save display name',exact:true}).click()
    await expect.poll(()=>localSQL(`SELECT full_name FROM public.profiles WHERE id='${user}'`)).toBe(name)
    await expect(page.getByText(first,{exact:true}).filter({visible:true})).toBeVisible()
    await nav(page,'Dashboard');await expect(page.getByText(first,{exact:true}).filter({visible:true})).toBeVisible()
    await page.goBack();await expect(page.locator('input[name="full_name"]').filter({visible:true})).toHaveValue(name)
    localSQL('REVOKE UPDATE ON public.profiles FROM authenticated')
    await page.locator('input[name="full_name"]').filter({visible:true}).fill(`${first} Failed`)
    await page.getByRole('button',{name:'Save display name',exact:true}).click()
    await expect(page.getByText('Unable to save your display name. Please try again.',{exact:true})).toBeVisible()
    expect(localSQL(`SELECT full_name FROM public.profiles WHERE id='${user}'`)).toBe(name)
    await expect(page.getByText(first,{exact:true}).filter({visible:true})).toBeVisible()
    localSQL('GRANT UPDATE ON public.profiles TO authenticated')
    const other=await browser.newContext({storageState:authState('b')})
    try{
      const otherPage=await other.newPage(),otherId=await owner(otherPage)
      const otherName=localSQL(`SELECT md5(coalesce(full_name,'')) FROM public.profiles WHERE id='${otherId}'`)
      await context.clearCookies();await context.addCookies(await other.cookies())
      const rejected=page.waitForResponse(response=>response.request().method()==='POST'&&new URL(response.url()).pathname==='/settings')
      await page.getByRole('button',{name:'Save display name',exact:true}).click();await rejected
      expect(localSQL(`SELECT md5(coalesce(full_name,'')) FROM public.profiles WHERE id='${otherId}'`)).toBe(otherName)
      expect(localSQL(`SELECT full_name FROM public.profiles WHERE id='${user}'`)).toBe(name)
      await expect(page.getByText(first,{exact:true}).filter({visible:true})).toHaveCount(0)
      await nav(page,'Dashboard');await expect(page.getByText(first,{exact:true}).filter({visible:true})).toHaveCount(0)
    }finally{await other.close()}
  }finally{
    localSQL('GRANT UPDATE ON public.profiles TO authenticated')
    if(user&&original!==null)localSQL(`UPDATE public.profiles SET full_name=${original==='null'?'null':`'${JSON.parse(original).replaceAll("'","''")}'`} WHERE id='${user}'`)
    await context.close()
  }
})
