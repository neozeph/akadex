import { authState } from "./ci-auth.ts"
import { test, expect, type Page } from "@playwright/test"
import { randomUUID } from "node:crypto"
import { localSQL } from "./migrations.ts"

function identity(value: string) {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value)) throw new Error("Invalid test identity")
  return value
}
async function owner(page: Page) {
  await page.goto("/pomodoro")
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeEnabled()
  return identity(await page.evaluate(() => {
    const key = Object.keys(localStorage).find((key) => key.startsWith("akadex:pomodoro-timer:"))
    if (!key) throw new Error("Timer account unavailable")
    return JSON.parse(localStorage.getItem(key)!).userId as string
  }))
}
function row(userId: string, type = "daily", due = "2030-01-01") {
  const task = randomUUID(), series = randomUUID(), title = `E2E-recurring-${task.slice(0,8)}`
  if (!["daily", "weekly", "weekdays", "monthly"].includes(type) || !/^\d{4}-\d{2}-\d{2}$/.test(due)) throw new Error("Invalid fixture")
  localSQL(`INSERT INTO public.task_series(id,user_id,title,recurrence_type,start_date) VALUES('${series}','${identity(userId)}','${title}','${type}','${due}'); INSERT INTO public.tasks(id,user_id,title,series_id,due_date) VALUES('${task}','${userId}','${title}','${series}','${due}')`)
  return { task, series, title, due }
}
type Row = ReturnType<typeof row>
function state(item: Row) {
  return JSON.parse(localSQL(`SELECT json_build_object('due',due_date,'status',status,'events',(SELECT count(*) FROM public.task_completions WHERE task_id='${item.task}')) FROM public.tasks WHERE id='${item.task}'`))
}
function cleanup(rows: Row[]) {
  for (const item of rows) localSQL(`DELETE FROM public.task_completions WHERE task_id='${item.task}'; DELETE FROM public.tasks WHERE id='${item.task}'; DELETE FROM public.task_series WHERE id='${item.series}'`)
}
async function tasks(page: Page) {
  await page.goto("/tasks")
  await page.getByRole("button", { name: "Add Task", exact: true }).first().click()
  const dialog = page.getByRole("dialog", { name: "New task", exact: true })
  await expect(dialog).toBeVisible()
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click()
}
function checkbox(page: Page, item: Row) { return page.getByRole("checkbox", { name: `Mark ${item.title} as complete`, exact: true }) }
async function complete(page: Page, item: Row) {
  const response = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/tasks"))
  await checkbox(page, item).locator("..").click()
  await response
}
async function analytics(page: Page, expected: string) {
  await page.goto("/analytics?range=7d")
  await expect(page.getByText("Completed (7 days)", { exact: true }).filter({ visible: true }).locator("..").locator("dd")).toHaveText(expected)
}

test("spec05 S1: recurring completion records progress and rolls daily, weekly, monthly, and weekday tasks", async ({ browser }) => {
  const context = await browser.newContext({ storageState: authState('a') })
  const page = await context.newPage()
  const rows: Row[] = []
  try {
    const user = await owner(page)
    const cases = [["daily","2030-01-01","2030-01-02"],["weekly","2030-01-01","2030-01-08"],["monthly","2030-01-31","2030-03-31"],["weekdays","2030-01-04","2030-01-07"]]
    for (const [type, due] of cases) rows.push(row(user, type, due))
    await tasks(page)
    for (const [index, item] of rows.entries()) {
      await complete(page, item)
      await expect.poll(() => state(item)).toEqual({ due: cases[index][2], status: "todo", events: 1 })
    }
    await analytics(page, "4")
    await page.reload()
    await analytics(page, "4")
  } finally { try { cleanup(rows) } finally { await context.close() } }
})

test("spec05 S2: simultaneous tabs and replay of the displayed occurrence advance once", async ({ browser }) => {
  const context = await browser.newContext({ storageState: authState('a') })
  const page = await context.newPage(), second = await context.newPage()
  const rows: Row[] = []
  let release = () => {}
  try {
    const item = row(await owner(page)); rows.push(item)
    await tasks(page); await tasks(second)
    let count = 0, arrived = () => {}
    const both = new Promise<void>((done) => { arrived = done })
    const gate = new Promise<void>((done) => { release = done })
    let replay: { headers: Record<string,string>; body: Buffer } | undefined
    await context.route("**/tasks", async (route) => {
      const request = route.request()
      if (request.method() !== "POST") { await route.continue(); return }
      replay = { headers: { "next-action": request.headers()["next-action"], "content-type": request.headers()["content-type"], origin: "http://127.0.0.1:3100" }, body: request.postDataBuffer()! }
      count++; if (count === 2) arrived()
      await gate; await route.continue()
    })
    await Promise.all([checkbox(page,item).locator("..").click(), checkbox(second,item).locator("..").click()])
    await both; release()
    await expect.poll(() => state(item)).toEqual({ due: "2030-01-02", status: "todo", events: 1 })
    await context.unrouteAll({ behavior: "wait" })
    expect(replay).toBeDefined()
    await context.request.post("http://127.0.0.1:3100/tasks", { headers: replay!.headers, data: replay!.body })
    expect(state(item)).toEqual({ due: "2030-01-02", status: "todo", events: 1 })
    await analytics(page, "1")
    await tasks(page); await tasks(second)
    await second.getByRole("heading", { name: item.title, exact: true }).click()
    const editor = second.getByRole("dialog", { name: "Edit task", exact: true })
    await expect(editor).toBeVisible()
    await editor.getByLabel("Task title", { exact: true }).fill(`${item.title}-stale-edit`)
    await complete(page, item)
    await expect.poll(() => state(item)).toEqual({ due: "2030-01-03", status: "todo", events: 2 })
    await editor.getByRole("button", { name: "Save changes", exact: true }).click()
    await expect(editor.getByRole("alert")).toContainText("Something went wrong")
    expect(state(item)).toEqual({ due: "2030-01-03", status: "todo", events: 2 })
  } finally {
    release(); await context.unrouteAll({ behavior: "wait" })
    try { cleanup(rows) } finally { await context.close() }
  }
})

test("spec05 S3: transaction failure preserves state; history and legacy counts stay account-owned", async ({ browser }) => {
  const context = await browser.newContext({ storageState: authState('a') })
  const other = await browser.newContext({ storageState: authState('b') })
  const page = await context.newPage(), foreign = await other.newPage()
  const rows: Row[] = []
  const ordinary = randomUUID()
  let rollbackTrigger = false
  let replay: { headers: Record<string,string>; body: Buffer } | undefined
  const dropFailure = () => {
    if (rollbackTrigger) { localSQL("DROP TRIGGER akadex_test_fail_event ON public.task_completions; DROP FUNCTION public.akadex_test_fail_event()"); rollbackTrigger = false }
  }
  try {
    const user = await owner(page)
    const item = row(user); rows.push(item)
    localSQL(`INSERT INTO public.tasks(id,user_id,title,status,completed_at) VALUES('${ordinary}','${user}','E2E-legacy-done','done',now()); CREATE FUNCTION public.akadex_test_fail_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced failure'; END $$; CREATE TRIGGER akadex_test_fail_event AFTER INSERT ON public.task_completions FOR EACH ROW WHEN(new.task_id='${item.task}') EXECUTE FUNCTION public.akadex_test_fail_event()`)
    rollbackTrigger = true
    await tasks(page)
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().endsWith("/tasks")) replay = { headers: { "next-action": request.headers()["next-action"], "content-type": request.headers()["content-type"], origin: "http://127.0.0.1:3100" }, body: request.postDataBuffer()! }
    })
    await complete(page, item)
    expect(state(item)).toEqual({ due: "2030-01-01", status: "todo", events: 0 })
    dropFailure()
    await tasks(page); await complete(page,item)
    await expect.poll(() => state(item).events).toBe(1)
    await analytics(page, "2")
    await tasks(foreign)
    await expect(foreign.getByRole("heading", { name: item.title, exact: true })).toHaveCount(0)
    expect(replay).toBeDefined()
    await other.request.post("http://127.0.0.1:3100/tasks", { headers: replay!.headers, data: replay!.body })
    expect(state(item)).toEqual({ due: "2030-01-02", status: "todo", events: 1 })
    await analytics(foreign, "0")
  } finally {
    try { dropFailure(); cleanup(rows); localSQL(`DELETE FROM public.tasks WHERE id='${ordinary}'`) } finally { await context.close(); await other.close() }
  }
})
