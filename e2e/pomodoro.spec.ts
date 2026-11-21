import { authState } from "./ci-auth.ts"
import { test, expect, type Page } from "@playwright/test"
import { execFileSync } from "node:child_process"
import { mkdir, writeFile } from "node:fs/promises"

const TIMER_PREFIX = "akadex:pomodoro-timer:"
const FIXED_TIME = "2026-11-20T12:00:00.000Z"

function sql(query: string) {
  return execFileSync("docker", ["exec", "supabase_db_akadex-e2e", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-At", "-c", query], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim()
}

function uuid(value: string) {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value)) throw new Error("Invalid test record identity")
  return value
}

function savedCount(completionId: string, owner?: string) {
  return Number(sql(`SELECT count(*) FROM public.pomodoro_sessions WHERE completion_id = '${uuid(completionId)}'${owner ? ` AND user_id = '${uuid(owner)}'` : ""}`))
}

function denySessionInserts() {
  if (sql("SELECT has_table_privilege('authenticated', 'public.pomodoro_sessions', 'INSERT')") !== "t") throw new Error("Unexpected initial insert privilege")
  sql("REVOKE INSERT ON public.pomodoro_sessions FROM authenticated")
  let outstanding = true
  return () => {
    if (!outstanding) return
    sql("GRANT INSERT ON public.pomodoro_sessions TO authenticated")
    outstanding = false
  }
}

async function storedTimer(page: Page, excludeOwner?: string) {
  return page.evaluate(({ prefix, excludeOwner }) => {
    const entries = Object.entries(localStorage).filter(([key, value]) => key.startsWith(prefix) && JSON.parse(value).userId !== excludeOwner)
    // Each fresh test context initially has one signed-in account's timer.
    const entry = entries[entries.length - 1]
    if (!entry) throw new Error("No account-scoped timer")
    return { key: entry[0], ...JSON.parse(entry[1]) } as { key: string; userId: string; snapshot: { completionId: string; completedAt: number | null; startedAt: string | null; completionHandled: boolean; sessionsCompleted: number; status: string } }
  }, { prefix: TIMER_PREFIX, excludeOwner })
}

async function preferences(page: Page, focus: string, breakTime: string) {
  await page.getByRole("button", { name: /^Focus \d+m/ }).click()
  const dialog = page.getByRole("dialog", { name: "Pomodoro settings", exact: true })
  const original = { focus: await dialog.getByLabel("Focus duration", { exact: true }).inputValue(), breakTime: await dialog.getByLabel("Break duration", { exact: true }).inputValue() }
  await dialog.getByLabel("Focus duration", { exact: true }).fill(focus)
  await dialog.getByLabel("Break duration", { exact: true }).fill(breakTime)
  await dialog.getByRole("button", { name: "Save", exact: true }).click()
  await expect(dialog).toBeHidden()
  return original
}

async function openTimer(page: Page) {
  await page.clock.install({ time: new Date("2026-11-20T11:59:00.000Z") })
  await page.clock.pauseAt(new Date(FIXED_TIME))
  await page.goto("/pomodoro")
  await expect(page).toHaveURL("http://127.0.0.1:3100/pomodoro")
  await expect(page.getByRole("heading", { name: "Pomodoro", exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeEnabled()
  const original = await preferences(page, "1", "1")
  await expect(page.getByText("01:00", { exact: true }).filter({ visible: true })).toBeVisible()
  return original
}

async function startFocus(page: Page) {
  await page.getByRole("button", { name: "Start", exact: true }).click()
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible()
  await expect.poll(async () => (await storedTimer(page)).snapshot.status).toBe("running")
  return storedTimer(page)
}

async function savedBreak(page: Page) {
  await expect(page.getByText("Break time", { exact: true }).filter({ visible: true })).toBeVisible()
  await expect(page.getByText("1 focus session saved", { exact: true }).filter({ visible: true })).toBeVisible()
}

async function cleanup(page: Page, ids: string[], original?: { focus: string; breakTime: string }) {
  try {
    if (original) {
      await page.goto("/pomodoro")
      await expect(page.getByRole("heading", { name: "Pomodoro", exact: true })).toBeVisible()
      await preferences(page, original.focus, original.breakTime)
    }
  } finally {
    if (ids.length) sql(`DELETE FROM public.pomodoro_sessions WHERE completion_id IN (${ids.map((id) => `'${uuid(id)}'`).join(",")})`)
  }
}

test("spec03 S1: save acknowledgement advances once and survives reload", async ({ browser }) => {
  const context = await browser.newContext({ storageState: authState('a') })
  const page = await context.newPage()
  let original: { focus: string; breakTime: string } | undefined
  const ids: string[] = []
  let release = () => {}
  try {
    original = await openTimer(page)
    const running = await startFocus(page)
    ids.push(running.snapshot.completionId)
    let received = () => {}
    const arrived = new Promise<void>((done) => { received = done })
    const gate = new Promise<void>((done) => { release = done })
    await page.route("**/pomodoro", async (route) => {
      if (route.request().method() !== "POST") { await route.continue(); return }
      const response = await route.fetch()
      received()
      await gate
      await route.fulfill({ response })
    })
    await page.clock.fastForward(60_000)
    await arrived
    await expect(page.getByText("Saving session...", { exact: true })).toBeVisible()
    expect((await storedTimer(page)).snapshot.completionHandled).toBe(false)
    expect((await storedTimer(page)).snapshot.sessionsCompleted).toBe(0)
    await expect(page.getByRole("button", { name: "Reset", exact: true })).toBeDisabled()
    release()
    await savedBreak(page)
    await page.unroute("**/pomodoro")
    expect(savedCount(ids[0])).toBe(1)
    const captured = sql(`SELECT json_build_object('duration', duration, 'completed', completed, 'started_at', started_at, 'ended_at', ended_at) FROM public.pomodoro_sessions WHERE completion_id = '${uuid(ids[0])}'`)
    const payload = JSON.parse(captured)
    expect(payload.duration).toBe(60)
    expect(payload.completed).toBe(true)
    expect(new Date(payload.started_at).toISOString()).toBe(FIXED_TIME)
    expect(new Date(payload.ended_at).toISOString()).toBe("2026-11-20T12:01:00.000Z")
    await mkdir("e2e/.cache", { recursive: true })
    await writeFile("e2e/.cache/pomodoro-response.json", captured)
    await page.reload()
    await savedBreak(page)
    expect(savedCount(ids[0])).toBe(1)
  } finally {
    release()
    await context.unrouteAll({ behavior: "wait" })
    try { await cleanup(page, ids, original) } finally { await context.close() }
  }
})

test("spec03 S2: failed save and reload retain the original completion for keyboard retry", async ({ browser }) => {
  const context = await browser.newContext({ storageState: authState('a') })
  const page = await context.newPage()
  let original: { focus: string; breakTime: string } | undefined
  let restore: (() => void) | undefined
  const ids: string[] = []
  try {
    original = await openTimer(page)
    const running = await startFocus(page)
    ids.push(running.snapshot.completionId)
    restore = denySessionInserts()
    await page.clock.fastForward(60_000)
    const retry = page.getByRole("button", { name: "Retry save", exact: true })
    await expect(retry).toBeEnabled()
    const pending = await storedTimer(page)
    expect(pending.snapshot).toMatchObject({ completionId: ids[0], completionHandled: false, startedAt: FIXED_TIME, completedAt: Date.parse("2026-11-20T12:01:00.000Z"), sessionsCompleted: 0 })
    expect(savedCount(ids[0])).toBe(0)
    await page.reload()
    await expect(retry).toBeEnabled()
    expect((await storedTimer(page)).snapshot).toEqual(pending.snapshot)
    await context.setOffline(true)
    const offlineFailure = page.waitForEvent("requestfailed", { predicate: (request) => request.method() === "POST" })
    await retry.click()
    await offlineFailure
    await expect(retry).toBeEnabled()
    expect((await storedTimer(page)).snapshot).toEqual(pending.snapshot)
    await context.setOffline(false)
    restore()
    await retry.focus()
    await retry.press("Enter")
    await savedBreak(page)
    expect(savedCount(ids[0])).toBe(1)
    expect(sql(`SELECT ended_at = '2026-11-20T12:01:00Z'::timestamptz FROM public.pomodoro_sessions WHERE completion_id = '${uuid(ids[0])}'`)).toBe("t")
  } finally {
    await context.setOffline(false)
    try { restore?.() } finally { try { await cleanup(page, ids, original) } finally { await context.close() } }
  }
})

test("spec03 S3: a lost response and second-tab replay save one logical session", async ({ browser }) => {
  const context = await browser.newContext({ storageState: authState('a') })
  const page = await context.newPage()
  let original: { focus: string; breakTime: string } | undefined
  const ids: string[] = []
  let release = () => {}
  try {
    original = await openTimer(page)
    const running = await startFocus(page)
    ids.push(running.snapshot.completionId)
    await page.route("**/pomodoro", async (route) => {
      if (route.request().method() !== "POST") { await route.continue(); return }
      const response = await route.fetch()
      await response.body()
      await route.abort("failed")
    })
    await page.clock.fastForward(60_000)
    await expect(page.getByRole("button", { name: "Retry save", exact: true })).toBeEnabled()
    expect(savedCount(ids[0])).toBe(1)
    await page.unroute("**/pomodoro")
    const second = await context.newPage()
    await second.clock.install({ time: new Date(FIXED_TIME) })
    await second.clock.pauseAt(new Date("2026-11-20T12:01:00.000Z"))
    let received = () => {}
    const arrived = new Promise<void>((done) => { received = done })
    const gate = new Promise<void>((done) => { release = done })
    await second.route("**/pomodoro", async (route) => {
      if (route.request().method() !== "POST") { await route.continue(); return }
      const response = await route.fetch()
      received()
      await gate
      await route.fulfill({ response })
    })
    await second.goto("/pomodoro")
    await arrived
    await page.getByRole("button", { name: "Retry save", exact: true }).click()
    await savedBreak(page)
    expect(savedCount(ids[0])).toBe(1)
    await page.getByRole("button", { name: "Start", exact: true }).click()
    await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible()
    release()
    await savedBreak(second)
    await expect(second.getByRole("button", { name: "Pause", exact: true })).toBeVisible()
    // A queued old acknowledgement must read current storage, not reset the break.
    await page.evaluate(({ key, userId, completionId }) => {
      const stale = { userId, snapshot: { version: 1, mode: "break", status: "idle", durationSeconds: 60, remainingSeconds: 60, endTime: null, startedAt: null, completionId, sessionsCompleted: 1, completedAt: null, completionHandled: false } }
      window.dispatchEvent(new StorageEvent("storage", { key, newValue: JSON.stringify(stale) }))
    }, { key: running.key, userId: running.userId, completionId: ids[0] })
    await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible()
    await second.reload()
    await savedBreak(second)
    expect(savedCount(ids[0])).toBe(1)
  } finally {
    release()
    await context.unrouteAll({ behavior: "wait" })
    try { await cleanup(page, ids, original) } finally { await context.close() }
  }
})

test("spec03 account isolation: another test session cannot save the previous account's pending timer", async ({ browser }) => {
  const context = await browser.newContext({ storageState: authState('a') })
  const other = await browser.newContext({ storageState: authState('b') })
  const page = await context.newPage()
  let original: { focus: string; breakTime: string } | undefined
  let restore: (() => void) | undefined
  const ids: string[] = []
  const accountACookies = await context.cookies()
  try {
    original = await openTimer(page)
    const running = await startFocus(page)
    ids.push(running.snapshot.completionId)
    restore = denySessionInserts()
    await page.clock.fastForward(60_000)
    const retry = page.getByRole("button", { name: "Retry save", exact: true })
    await expect(retry).toBeEnabled()
    restore()
    // Reuse only manual sessions or the explicitly approved disposable CI sessions.
    // This scenario never types or exposes credentials.
    // Account teardown can reload the document; let its hydration microtasks run.
    await page.clock.resume()
    await context.clearCookies()
    await context.addCookies(await other.cookies())
    const rejectedSave = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/pomodoro"))
    await retry.click()
    await rejectedSave
    // Next can return the newly authenticated account's Server Component tree.
    await expect(page.getByRole("button", { name: "Start", exact: true })).toBeEnabled()
    expect(savedCount(ids[0])).toBe(0)
    await page.reload()
    await expect(page.getByText("Focus time", { exact: true }).filter({ visible: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Start", exact: true })).toBeEnabled()
    expect((await storedTimer(page, running.userId)).userId === running.userId).toBe(false)
    expect(savedCount(ids[0])).toBe(0)
  } finally {
    try { restore?.() } finally {
      await context.clearCookies()
      await context.addCookies(accountACookies)
      try { await cleanup(page, ids, original) } finally { await context.close(); await other.close() }
    }
  }
})
