import { authState } from "./ci-auth.ts"
import { test, expect, type Page, type BrowserContext } from "@playwright/test"
import { randomUUID } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import { createServerClient } from "@supabase/ssr"
import { localRuntime } from "./runtime.ts"
import { localSQL } from "./migrations.ts"

const literal = 'ExAm_%,"\\ café'
function quote(value: string) { return `'${value.replaceAll("'", "''")}'` }
async function owner(page: Page) {
  await page.goto("/pomodoro")
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeEnabled()
  const id = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((key) => key.startsWith("akadex:pomodoro-timer:"))
    if (!key) throw new Error("Missing account timer")
    return JSON.parse(localStorage.getItem(key)!).userId as string
  })
  if (!/^[a-f0-9-]{36}$/i.test(id)) throw new Error("Invalid fixture owner")
  return id
}
function client(context?: BrowserContext) {
  const { env } = localRuntime()
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { cookies: { getAll: async () => context ? (await context.cookies()).map(({ name, value }) => ({ name, value })) : [] } })
}
function smallFixture(user: string) {
  const semester = randomUUID(), first = randomUUID(), second = randomUUID()
  const ids = Array.from({ length: 4 }, () => randomUUID())
  const titles = ids.map((id, index) => `E2E-query-${index}-${id.slice(0,8)}${index === 2 ? ` ${literal}` : ""}`)
  localSQL(`BEGIN; INSERT INTO public.semesters(id,user_id,title,school_year) VALUES('${semester}','${user}','query verification','2026'); INSERT INTO public.subjects(id,user_id,semester_id,subject_code,subject_name,units) VALUES('${first}','${user}','${semester}','QUERY-A','Query A',3),('${second}','${user}','${semester}','QUERY-B','Query B',3);
    INSERT INTO public.tasks(id,user_id,title,description,tags,status,priority,subject_id) VALUES
    ('${ids[0]}','${user}',${quote(titles[0])},${quote(literal)},ARRAY['shared'],'in_progress','high','${first}'),
    ('${ids[1]}','${user}',${quote(titles[1])},'other',ARRAY[${quote(`prefix${literal.toUpperCase()}suffix`)}],'todo','medium','${second}'),
    ('${ids[2]}','${user}',${quote(titles[2])},NULL,'{}','done','high','${first}'),
    ('${ids[3]}','${user}',${quote(titles[3])},'other','{}','todo','low','${first}'); COMMIT;`)
  return { semester, first, ids, titles }
}
async function taskTitles(page: Page) {
  return page.locator("article[data-no-drag-scroll]").filter({ visible: true }).locator("h3").allTextContents()
}

test("spec06 S1: combined literal title-description-tag filters preserve current semantics", async ({ browser }) => {
  const context = await browser.newContext({ storageState: authState('a') })
  const page = await context.newPage()
  let fixture: ReturnType<typeof smallFixture> | undefined
  try {
    fixture = smallFixture(await owner(page))
    const params = new URLSearchParams({ q: literal, status: "in_progress", priority: "high", subject: fixture.first })
    await page.goto(`/tasks?${params}`)
    await expect(page.getByRole("heading", { name: fixture.titles[0], exact: true })).toBeVisible()
    expect(await taskTitles(page)).toEqual([fixture.titles[0]])
    params.set("status", "done")
    await page.goto(`/tasks?${params}`)
    expect(await taskTitles(page)).toEqual([fixture.titles[2]])
    await page.goto(`/tasks?${new URLSearchParams({ q: literal })}`)
    await expect(page.getByRole("heading", { name: fixture.titles[1], exact: true })).toBeVisible()
    expect((await taskTitles(page)).sort()).toEqual(fixture.titles.slice(0,2).sort())
    const response = await client(context).from("tasks").select("id,title,description,tags,due_date,priority,status,subject_id,series_id,created_at,subject:subjects(subject_code,subject_name),series:task_series(recurrence_type)").order("title")
    expect(response.error === null).toBe(true)
    await mkdir("e2e/.cache", { recursive: true })
    await writeFile("e2e/.cache/task-filter-baseline.json", JSON.stringify(response.data))
    await page.getByRole("button", { name: "Clear", exact: true }).click()
    await expect(page).toHaveURL("http://127.0.0.1:3100/tasks")
    await expect.poll(async()=>(await taskTitles(page)).length).toBe(3)
    await page.getByRole("textbox", { name: "Search tasks", exact: true }).fill("no-matching-query")
    await page.getByRole("button", { name: "Search", exact: true }).click()
    await expect(page).toHaveURL(/q=no-matching-query/)
    await expect(page.getByText(/No tasks match your search/)).toBeVisible()
    await page.goBack()
    await expect(page.getByRole("textbox", { name: "Search tasks", exact: true })).toHaveValue("")
    await page.goForward()
    await expect(page.getByRole("textbox", { name: "Search tasks", exact: true })).toHaveValue("no-matching-query")
  } finally {
    try { if (fixture) localSQL(`DELETE FROM public.tasks WHERE id IN (${fixture.ids.map(quote).join(",")}); DELETE FROM public.semesters WHERE id='${fixture.semester}'`) } finally { await context.close() }
  }
})

test("spec06 S2: bounded stable pages reach matches beyond 1,000 rows without returning unrelated history", async ({ browser }) => {
  const context = await browser.newContext({ storageState: authState('a') })
  const page = await context.newPage()
  const prefix = randomUUID().slice(0,24), history = randomUUID().slice(0,24)
  const title = `E2E-page-${prefix.slice(0,8)}-`
  try {
    const user = await owner(page)
    await mkdir("e2e/.cache", { recursive: true })
    await writeFile("e2e/.cache/task-query-bulk-cleanup.json", JSON.stringify({ prefixes: [prefix,history] }))
    localSQL(`BEGIN;
      INSERT INTO public.tasks(id,user_id,title,status,due_date,created_at)
      SELECT ('${prefix}' || lpad(i::text,12,'0'))::uuid,'${user}','${title}' || lpad(i::text,4,'0'),'todo',CASE WHEN i=1102 THEN NULL ELSE '2030-01-01'::date END,'2026-01-01T00:00:00Z' FROM generate_series(0,1102) i;
      INSERT INTO public.tasks(id,user_id,title,status,created_at)
      SELECT ('${history}' || lpad(i::text,12,'0'))::uuid,'${user}','E2E-unrelated-history-' || i,'done','2026-01-01T00:00:00Z' FROM generate_series(0,1102) i;
      COMMIT;`)
    await page.goto("/tasks")
    await expect(page.getByRole("heading", { name: `${title}0000`, exact: true })).toBeVisible()
    const first = await taskTitles(page)
    expect(first.length).toBe(50)
    expect(first[49]).toBe(`${title}0049`)
    await page.getByRole("link", { name: "Next page", exact: true }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect(page.getByRole("heading", { name: `${title}0050`, exact: true })).toBeVisible()
    const second = await taskTitles(page)
    expect(second.length).toBe(50)
    expect(second[49]).toBe(`${title}0099`)
    expect(second.some((value) => first.includes(value))).toBe(false)
    await page.goto("/tasks?page=23")
    await expect(page.getByRole("heading", { name: `${title}1102`, exact: true })).toBeVisible()
    expect((await taskTitles(page)).length).toBe(3)
    await expect(page.getByRole("link", { name: "Next page", exact: true })).toHaveCount(0)
    await page.goto(`/tasks?${new URLSearchParams({ q: `${title}1102` })}`)
    await expect(page.getByRole("heading", { name: `${title}1102`, exact: true })).toBeVisible()
    expect((await taskTitles(page)).length).toBe(1)
    await page.goto("/tasks?page=99999")
    await expect(page.getByText("This page has no matches. Use First page or Previous page to continue.").filter({visible:true})).toBeVisible()
    await page.getByRole("link", { name: "First page", exact: true }).click()
    await expect(page).toHaveURL("http://127.0.0.1:3100/tasks")
    await page.goto("/tasks?page=2")
    await page.getByRole("link", { name: "Done", exact: true }).click()
    await expect(page).toHaveURL("http://127.0.0.1:3100/tasks?status=done")
    const sdk = client(context)
    const columns = "id,title,description,tags,due_date,priority,status,subject_id,series_id,created_at,subject:subjects(subject_code,subject_name),series:task_series(recurrence_type)"
    const oldRead = await sdk.from("tasks").select(columns).order("due_date", { ascending:true, nullsFirst:false }).order("created_at", { ascending:false })
    const bounded = await sdk.rpc("search_tasks", {}, { get:true }).select(columns).order("due_date", { ascending:true, nullsFirst:false }).order("created_at", { ascending:false }).order("id").range(0,50)
    expect(oldRead.error === null && bounded.error === null).toBe(true)
    const boundedRows = Array.isArray(bounded.data) ? bounded.data : []
    expect(oldRead.data?.length).toBe(1000)
    expect(boundedRows.length).toBe(51)
    expect(boundedRows.every((task) => task.status !== "done")).toBe(true)
    await writeFile("e2e/.cache/task-query-payload.json", JSON.stringify({ datasetTasks:2206, oldRows:oldRead.data?.length, fetchedRows:boundedRows.length, visibleRows:50, oldBytes:Buffer.byteLength(JSON.stringify(oldRead.data)), boundedBytes:Buffer.byteLength(JSON.stringify(boundedRows)) }))
  } finally {
    try { localSQL(`DELETE FROM public.tasks WHERE id::text LIKE '${prefix}%' OR id::text LIKE '${history}%'`) } finally { await context.close() }
  }
})

test("spec06 S3: slow, failed, invalid, foreign, and expired reads remain honest and recoverable", async ({ browser }) => {
  const context = await browser.newContext({ storageState: authState('a') })
  const other = await browser.newContext({ storageState: authState('b') })
  const page = await context.newPage(), foreign = await other.newPage()
  let fixture: ReturnType<typeof smallFixture> | undefined
  let restore = false, release = () => {}
  try {
    fixture = smallFixture(await owner(page))
    await page.goto("/tasks")
    let arrived = () => {}
    const received = new Promise<void>((done) => { arrived=done })
    const gate = new Promise<void>((done) => { release=done })
    await page.route("**/api/tasks?**", async (route) => { const response=await route.fetch(); arrived(); await gate; await route.fulfill({response}) })
    await page.getByRole("textbox", { name:"Search tasks", exact:true }).fill("slow-no-matches")
    await page.getByRole("button", { name:"Search", exact:true }).click()
    await received
    await expect(page.getByRole("button", { name:"Searching...", exact:true })).toBeDisabled()
    await expect(page.getByText("Updating tasks...", {exact:true})).toBeVisible()
    release(); await context.unrouteAll({ behavior:"wait" })
    await expect(page.getByText(/No tasks match your search/)).toBeVisible()
    await page.goto("/tasks?status=invalid&subject=not-a-uuid&page=-5")
    await expect(page.getByText(/Invalid filters were ignored/)).toBeVisible()
    if (localSQL("SELECT has_table_privilege('authenticated','public.tasks','SELECT')") !== "t") throw new Error("Unexpected test permission")
    localSQL("REVOKE SELECT ON public.tasks FROM authenticated"); restore=true
    await page.goto("/tasks")
    const heading=page.getByRole("heading", {name:"Tasks unavailable",exact:true})
    await expect(heading).toBeVisible(); await expect(heading).toBeFocused()
    await expect(heading.locator("..").getByRole("alert")).toHaveText("Unable to load your tasks right now. Please try again.")
    localSQL("GRANT SELECT ON public.tasks TO authenticated"); restore=false
    const retry=page.getByRole("button", {name:"Try again",exact:true})
    await retry.focus(); await retry.press("Enter")
    await expect(page.getByRole("heading", {name:"Tasks",exact:true})).toBeVisible()
    await foreign.goto("/tasks")
    expect((await taskTitles(foreign)).length).toBe(0)
    const hidden = await client(other).rpc("search_tasks", { p_search:literal, p_subject:fixture.first })
    expect(hidden.error === null && hidden.data?.length === 0).toBe(true)
    const anonymous = await client().rpc("search_tasks")
    expect(anonymous.error !== null && anonymous.data === null).toBe(true)
    await context.addCookies((await context.cookies()).map((cookie) => ({...cookie,expires:1})))
    await page.goto("/tasks")
    await expect(page).toHaveURL(/\/login/)
  } finally {
    release(); await context.unrouteAll({behavior:"wait"})
    try {
      if(restore) localSQL("GRANT SELECT ON public.tasks TO authenticated")
      if(fixture) localSQL(`DELETE FROM public.tasks WHERE id IN (${fixture.ids.map(quote).join(",")}); DELETE FROM public.semesters WHERE id='${fixture.semester}'`)
    } finally { await context.close(); await other.close() }
  }
})
