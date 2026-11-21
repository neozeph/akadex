import { authState } from "./ci-auth.ts"
import { test, expect, type Page } from "@playwright/test"
import { randomUUID } from "node:crypto"
import { localSQL } from "./migrations.ts"
import { readFile, mkdir, writeFile } from "node:fs/promises"

async function reads(benchmark:string){
  try{return (await readFile("e2e/.cache/metrics.ndjson","utf8")).split(/\r?\n/).filter(Boolean).map((line)=>JSON.parse(line)).filter((row)=>row.metric?.benchmark===benchmark&&row.metric?.kind==="operation"&&row.metric?.operation==="task-page").length}catch{return 0}
}
test("spec07 S1: SSR hydration and fresh revisits avoid duplicate reads; stale data refreshes",async({browser})=>{
  const benchmark=`bench-${randomUUID().replaceAll("-","")}`
  const context=await browser.newContext({storageState:authState('a'),extraHTTPHeaders:{"x-akadex-benchmark":benchmark}}),page=await context.newPage()
  const ids=[randomUUID(),randomUUID()],titles=ids.map((id)=>`E2E-cache-read-${id.slice(0,8)}`)
  let apiReads=0
  page.on("request",(request)=>{if(new URL(request.url()).pathname==="/api/tasks")apiReads++})
  try{
    const user=await owner(page)
    localSQL(`INSERT INTO public.tasks(id,user_id,title,status,completed_at) VALUES('${ids[0]}','${user}','${titles[0]}','todo',null),('${ids[1]}','${user}','${titles[1]}','done',now())`)
    await ready(page)
    await expect(page.getByRole("heading",{name:titles[0],exact:true})).toBeVisible()
    await expect.poll(()=>reads(benchmark)).toBe(1);expect(apiReads).toBe(0)
    const firstRead=page.waitForResponse((response)=>new URL(response.url()).pathname==="/api/tasks")
    await page.getByRole("link",{name:"Done",exact:true}).click()
    const calendar=await (await firstRead).json()
    expect(calendar.todayISO).toBe(localSQL(`SELECT (now() AT TIME ZONE timezone)::date FROM public.profiles WHERE id='${user}'`))
    expect(calendar.timeZone).toBe(localSQL(`SELECT timezone FROM public.profiles WHERE id='${user}'`))
    await expect(page.getByRole("heading",{name:titles[1],exact:true})).toBeVisible();expect(apiReads).toBe(1)
    await page.getByRole("link",{name:"Active",exact:true}).click()
    await expect(page.getByRole("heading",{name:titles[0],exact:true})).toBeVisible();expect(apiReads).toBe(1)
    await page.getByRole("link",{name:"Dashboard",exact:true}).first().click()
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.getByRole("link",{name:"Tasks",exact:true}).first().click()
    await expect(page.getByRole("heading",{name:titles[0],exact:true})).toBeVisible()
    await expect.poll(()=>reads(benchmark)).toBe(2);expect(apiReads).toBe(1)
    await page.clock.install();await page.clock.fastForward(46_000)
    await page.evaluate(()=>window.dispatchEvent(new Event("visibilitychange")))
    await expect.poll(()=>apiReads).toBe(2);await expect.poll(()=>reads(benchmark)).toBe(3)
    await mkdir("e2e/.cache",{recursive:true})
    await writeFile("e2e/.cache/task-cache-reads.json",JSON.stringify({initialTaskReads:1,hydrationApiReads:0,freshFilterAndRouteRevisitAdditionalReads:0,firstFilterApiReads:1,staleRefreshApiReads:1,staleTimeMs:45000}))
  }finally{try{localSQL(`DELETE FROM public.tasks WHERE id IN ('${ids[0]}','${ids[1]}')`)}finally{await context.close()}}
})

async function owner(page:Page){
  await page.goto("/pomodoro");await expect(page.getByRole("button",{name:"Start",exact:true})).toBeEnabled()
  const id=await page.evaluate(()=>{const key=Object.keys(localStorage).find((key)=>key.startsWith("akadex:pomodoro-timer:"));if(!key)throw Error("No timer account");return JSON.parse(localStorage.getItem(key)!).userId as string})
  if(!/^[a-f0-9-]{36}$/i.test(id))throw Error("Invalid fixture account");return id
}
async function ready(page:Page){
  await page.goto("/tasks");await page.getByRole("button",{name:"Add Task",exact:true}).first().click()
  const dialog=page.getByRole("dialog",{name:"New task",exact:true});await expect(dialog).toBeVisible();await dialog.getByRole("button",{name:"Cancel",exact:true}).click()
}
test("task toasts: create, edit and delete show confirmed feedback with keyboard dismissal",async({browser})=>{
  const context=await browser.newContext({storageState:authState('a')}),page=await context.newPage()
  const title=`E2E-toast-${randomUUID()}`,edited=`${title}-edited`
  try{
    await owner(page);await ready(page)
    await page.getByRole("button",{name:"Add Task",exact:true}).first().click()
    const create=page.getByRole("dialog",{name:"New task",exact:true})
    await create.getByLabel("Task title",{exact:true}).fill(title)
    await create.getByRole("button",{name:"Save task",exact:true}).click()
    const notifications=page.getByRole("region",{name:"Notifications",exact:true})
    await expect(notifications.getByText("Task created.",{exact:true})).toBeVisible()
    await notifications.getByRole("button",{name:"Dismiss notification",exact:true}).focus()
    await page.keyboard.press("Enter")
    await expect(notifications.getByText("Task created.",{exact:true})).toHaveCount(0)
    await page.getByRole("button",{name:`Edit ${title}`,exact:true}).click()
    const edit=page.getByRole("dialog",{name:"Edit task",exact:true})
    await edit.getByLabel("Task title",{exact:true}).fill(edited)
    await edit.getByRole("button",{name:"Save changes",exact:true}).click()
    await expect(notifications.getByText("Task updated.",{exact:true})).toBeVisible()
    await page.getByRole("button",{name:`Delete ${edited}`,exact:true}).click()
    await page.getByRole("button",{name:"Delete task",exact:true}).click()
    await expect(notifications.getByText("Task deleted.",{exact:true})).toBeVisible()
    await page.reload();await expect(page.getByRole("heading",{name:edited,exact:true})).toHaveCount(0)
    expect(localSQL(`SELECT count(*) FROM public.tasks WHERE title IN ('${title}','${edited}')`)).toBe("0")
  }finally{localSQL(`DELETE FROM public.tasks WHERE title IN ('${title}','${edited}')`);await context.close()}
})

test("spec07 S2: failed completion restores its checkbox and offers an inline retry",async({browser})=>{
  const context=await browser.newContext({storageState:authState('a')}),page=await context.newPage()
  const id=randomUUID(),title=`E2E-cache-${id.slice(0,8)}`,series=randomUUID(),recurring=randomUUID(),recurringTitle=`E2E-cache-recurring-${recurring.slice(0,8)}`;let restore=false,restoreRead=false,release=()=>{}
  try{
    const user=await owner(page);localSQL(`BEGIN; INSERT INTO public.tasks(id,user_id,title) VALUES('${id}','${user}','${title}'); INSERT INTO public.task_series(id,user_id,title,recurrence_type,start_date) VALUES('${series}','${user}','${recurringTitle}','daily','2030-01-01'); INSERT INTO public.tasks(id,user_id,title,series_id,due_date) VALUES('${recurring}','${user}','${recurringTitle}','${series}','2030-01-01'); COMMIT;`)
    await ready(page)
    if(localSQL("SELECT has_table_privilege('authenticated','public.tasks','UPDATE')")!=="t")throw Error("Unexpected permission")
    localSQL("REVOKE UPDATE ON public.tasks FROM authenticated");restore=true
    await page.route("**/tasks",async(route)=>{
      if(route.request().method()!=="POST"){await route.continue();return}
      const response=await route.fetch()
      localSQL("REVOKE SELECT ON public.tasks FROM authenticated");restoreRead=true
      await route.fulfill({response})
    })
    await page.getByRole("checkbox",{name:`Mark ${title} as complete`,exact:true}).locator("..").click()
    await expect(page.getByText("Could not save completion. Your task was restored. Retry.",{exact:true})).toBeVisible()
    const notifications=page.getByRole("region",{name:"Notifications",exact:true})
    await expect(notifications.getByText("Could not save completion. Try again.",{exact:true})).toBeVisible()
    await notifications.getByRole("button",{name:"Dismiss notification",exact:true}).click()
    await expect(page.getByRole("checkbox",{name:`Mark ${title} as complete`,exact:true})).not.toBeChecked()
    localSQL("GRANT UPDATE, SELECT ON public.tasks TO authenticated");restore=false;restoreRead=false
    await context.unrouteAll({behavior:"wait"})
    // Return the gate without awaiting its receipt before the click.
    let arrived=()=>{};let received=new Promise<void>((done)=>{arrived=done}),gate=new Promise<void>((done)=>{release=done})
    await page.route("**/tasks",async(route)=>{if(route.request().method()!=="POST"){await route.continue();return}const response=await route.fetch();arrived();await gate;await route.fulfill({response})})
    await page.getByRole("button",{name:`Retry completion for ${title}`,exact:true}).click();await received
    await expect(page.getByRole("heading",{name:title,exact:true})).toHaveCount(0)
    await expect(page.getByText("Saving 1 task completion...",{exact:true}).filter({visible:true})).toBeVisible()
    expect(localSQL(`SELECT status='done' FROM public.tasks WHERE id='${id}'`)).toBe("t")
    release();await context.unrouteAll({behavior:"wait"});await expect(page.getByText("Saving 1 task completion...",{exact:true}).filter({visible:true})).toHaveCount(0)
    await expect(notifications.getByText("Task completed.",{exact:true})).toBeVisible()
    await page.reload();await expect(page.getByRole("heading",{name:title,exact:true})).toHaveCount(0)
    let recurringRequests=0
    received=new Promise<void>((done)=>{arrived=done});gate=new Promise<void>((done)=>{release=done})
    await page.route("**/tasks",async(route)=>{if(route.request().method()!=="POST"){await route.continue();return}recurringRequests++;const response=await route.fetch();arrived();await gate;await route.fulfill({response})})
    const box=page.getByRole("checkbox",{name:`Mark ${recurringTitle} as complete`,exact:true})
    await box.locator("..").dblclick();await received
    await expect(box).toBeDisabled();await expect(box).toBeChecked()
    await expect(page.getByRole("heading",{name:recurringTitle,exact:true})).toBeVisible()
    release();await context.unrouteAll({behavior:"wait"});await expect(box).toBeEnabled()
    await expect(box).not.toBeChecked();expect(recurringRequests).toBe(1)
    expect(localSQL(`SELECT due_date='2030-01-02' AND (SELECT count(*)=1 FROM public.task_completions WHERE task_id='${recurring}') FROM public.tasks WHERE id='${recurring}'`)).toBe("t")
    await page.reload();await expect(page.locator('[id="planner-column-2030-01-02"]').filter({visible:true})).toBeVisible()
  }finally{release();await context.unrouteAll({behavior:"wait"});try{if(restore)localSQL("GRANT UPDATE ON public.tasks TO authenticated");if(restoreRead)localSQL("GRANT SELECT ON public.tasks TO authenticated");localSQL(`DELETE FROM public.task_completions WHERE task_id='${recurring}'; DELETE FROM public.tasks WHERE id IN ('${id}','${recurring}'); DELETE FROM public.task_series WHERE id='${series}'`)}finally{await context.close()}}
})

test("spec07 initial session race: missing browser auth after SSR clears hydrated protected data",async({browser})=>{
  const context=await browser.newContext({storageState:authState('a')}),page=await context.newPage()
  const id=randomUUID(),title=`E2E-cache-privacy-${id.slice(0,8)}`
  try{
    const user=await owner(page);localSQL(`INSERT INTO public.tasks(id,user_id,title) VALUES('${id}','${user}','${title}')`)
    let first=true
    await page.route("**/tasks",async(route)=>{
      if(!first||!route.request().isNavigationRequest()){await route.continue();return}
      first=false
      const response=await route.fetch(),headers={...response.headers()};delete headers["set-cookie"]
      await context.clearCookies();await route.fulfill({response,headers})
    })
    await page.goto("/tasks")
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole("heading",{name:title,exact:true})).toHaveCount(0)
  }finally{try{localSQL(`DELETE FROM public.tasks WHERE id='${id}'`)}finally{await context.close()}}
})

test("spec07 S3: concurrent rollback, filter changes, account switching, and logout protect cached state",async({browser})=>{
  const context=await browser.newContext({storageState:authState('a')}),other=await browser.newContext({storageState:authState('b')})
  const page=await context.newPage(),second=await other.newPage(),ids=[randomUUID(),randomUUID(),randomUUID()],titles=ids.map((id)=>`E2E-cache-concurrent-${id.slice(0,8)}`)
  let trigger=false,release=()=>{}
  const drop=()=>{if(trigger){localSQL("DROP TRIGGER akadex_cache_failure ON public.tasks; DROP FUNCTION public.akadex_cache_failure()");trigger=false}}
  try{
    const a=await owner(page),b=await owner(second)
    localSQL(`BEGIN; INSERT INTO public.tasks(id,user_id,title) VALUES('${ids[0]}','${a}','${titles[0]}'),('${ids[1]}','${a}','${titles[1]}'),('${ids[2]}','${b}','${titles[2]}'); CREATE FUNCTION public.akadex_cache_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced completion failure'; END $$; CREATE TRIGGER akadex_cache_failure BEFORE UPDATE ON public.tasks FOR EACH ROW WHEN(OLD.id='${ids[0]}' AND NEW.status='done') EXECUTE FUNCTION public.akadex_cache_failure(); COMMIT;`);trigger=true
    await ready(page)
    let arrived=()=>{};const received=new Promise<void>((done)=>{arrived=done}),gate=new Promise<void>((done)=>{release=done})
    let held=false
    await page.route("**/tasks",async(route)=>{if(route.request().method()!=="POST"||held){await route.continue();return}held=true;const response=await route.fetch();arrived();await gate;await route.fulfill({response})})
    await page.getByRole("checkbox",{name:`Mark ${titles[0]} as complete`,exact:true}).locator("..").click();await received
    await page.getByRole("checkbox",{name:`Mark ${titles[1]} as complete`,exact:true}).locator("..").click()
    await expect(page.getByText("Saving 2 task completions...",{exact:true}).filter({visible:true})).toBeVisible()
    await page.getByRole("link",{name:"Done",exact:true}).click();release();await context.unrouteAll({behavior:"wait"})
    await expect(page.getByRole("heading",{name:titles[1],exact:true})).toBeVisible()
    await expect(page.getByRole("heading",{name:titles[0],exact:true})).toHaveCount(0)
    await page.getByRole("link",{name:"Active",exact:true}).click()
    await expect(page.getByRole("checkbox",{name:`Mark ${titles[0]} as complete`,exact:true})).not.toBeChecked()
    expect(localSQL(`SELECT (SELECT status='todo' FROM public.tasks WHERE id='${ids[0]}') AND (SELECT status='done' FROM public.tasks WHERE id='${ids[1]}')`)).toBe("t")
    drop();await page.getByRole("button",{name:`Retry completion for ${titles[0]}`,exact:true}).click()
    await expect(page.getByRole("heading",{name:titles[0],exact:true})).toHaveCount(0)
    await expect(page.getByText("Saving 1 task completion...",{exact:true}).filter({visible:true})).toHaveCount(0)
    await context.clearCookies();await context.addCookies(await other.cookies())
    const mismatch=page.waitForResponse((response)=>new URL(response.url()).pathname==="/api/tasks")
    await page.getByRole("button",{name:"Refresh tasks",exact:true}).click();expect((await mismatch).status()).toBe(409)
    await expect(page.getByRole("heading",{name:titles[2],exact:true})).toBeVisible()
    await expect(page.getByRole("heading",{name:titles[0],exact:true})).toHaveCount(0)
    await expect(page.getByRole("heading",{name:titles[1],exact:true})).toHaveCount(0)
    let logoutArrived=()=>{};const logout=new Promise<void>((done)=>{logoutArrived=done}),logoutGate=new Promise<void>((done)=>{release=done})
    await page.route("**/auth/v1/logout**",async(route)=>{logoutArrived();await logoutGate;await route.abort()})
    await page.getByRole("button",{name:"Sign out",exact:true}).first().click();await logout
    await expect(page.getByText("Account session changed. Reloading...",{exact:true})).toBeVisible()
    await expect(page.getByRole("heading",{name:titles[2],exact:true})).toHaveCount(0)
    // Abort the held logout request during teardown: the manually created session remains reusable.
  }finally{release();await context.unrouteAll({behavior:"wait"});try{drop();localSQL(`DELETE FROM public.tasks WHERE id IN ('${ids[0]}','${ids[1]}','${ids[2]}')`)}finally{await context.close();await other.close()}}
})
