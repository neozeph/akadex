import { authState } from "./ci-auth.ts"
import { test, expect, type Page } from "@playwright/test"
import { execFileSync } from "node:child_process"
import { randomUUID } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"

function sql(query: string) {
  return execFileSync("docker", ["exec", "supabase_db_akadex-e2e", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-At", "-c", query], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim()
}
function uuid(value: string) {
  if (!/^[a-f0-9-]{36}$/i.test(value)) throw new Error("Invalid test identity")
  return value
}
async function settings(page: Page) {
  await page.goto("/settings")
  await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible()
  return page.getByLabel("Timezone", { exact: true }).inputValue()
}
async function saveZone(page: Page, zone: string) {
  await page.getByLabel("Timezone", { exact: true }).fill(zone)
  await page.getByRole("button", { name: "Save timezone", exact: true }).click()
  await expect(page.getByRole("status").filter({ hasText: "Timezone saved." })).toBeVisible()
}
async function owner(page: Page) {
  await page.goto("/pomodoro")
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeEnabled()
  return uuid(await page.evaluate(() => {
    const key = Object.keys(localStorage).find((key) => key.startsWith("akadex:pomodoro-timer:"))
    if (!key) throw new Error("Timer account unavailable")
    return JSON.parse(localStorage.getItem(key)!).userId as string
  }))
}

test("spec04 S1: timezone persists, rejects invalid input, and ignores a foreign profile ID", async ({ browser }) => {
  const context = await browser.newContext({ storageState: authState('a'), timezoneId: "America/Los_Angeles" })
  const other = await browser.newContext({ storageState: authState('b') })
  const page = await context.newPage()
  const second = await other.newPage()
  let original: string | undefined
  try {
    const foreignId = await owner(second)
    const otherZone = await settings(second)
    original = await settings(page)
    await page.locator("#timezone").filter({visible:true}).evaluate((input, id) => {
      const hidden = document.createElement("input")
      hidden.name = "id"; hidden.value = id
      input.closest("form")!.append(hidden)
    }, foreignId)
    await saveZone(page, "America/New_York")
    await page.reload()
    await expect(page.getByLabel("Timezone", { exact: true })).toHaveValue("America/New_York")
    expect(sql(`SELECT timezone FROM public.profiles WHERE id = '${foreignId}'`)).toBe(otherZone)
    await page.getByLabel("Timezone", { exact: true }).fill("invalid/zone")
    await page.getByRole("button", { name: "Save timezone", exact: true }).click()
    await expect(page.locator("form").getByRole("alert")).toHaveText("Enter a valid IANA timezone, such as Asia/Manila.")
    await page.reload()
    await expect(page.getByLabel("Timezone", { exact: true })).toHaveValue("America/New_York")
  } finally {
    try { if (original) { await settings(page); await saveZone(page, original) } } finally { await context.close(); await other.close() }
  }
})

test("spec04 S2: Manila boundaries agree across dashboard, focus, planner, and analytics", async ({ browser }) => {
  const context = await browser.newContext({ storageState: authState('a'), timezoneId: "America/Los_Angeles" })
  const page = await context.newPage()
  const ids = Array.from({ length: 5 }, () => randomUUID())
  let original: string | undefined
  try {
    const userId = await owner(page)
    original = await settings(page)
    await saveZone(page, "Asia/Manila")
    // PostgreSQL independently derives the actual current day; no app helper computes expectations.
    const day = sql("SELECT (now() AT TIME ZONE 'Asia/Manila')::date")
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("Invalid test date")
    const start = `('${day}'::date::timestamp AT TIME ZONE 'Asia/Manila')`
    const end = `(('${day}'::date + 1)::timestamp AT TIME ZONE 'Asia/Manila')`
    const times = [`${start} - interval '1 millisecond'`, start, `${end} - interval '1 millisecond'`, end]
    for (let i = 0; i < 4; i++) sql(`INSERT INTO public.pomodoro_sessions(id,user_id,duration,completed,started_at,ended_at) VALUES('${ids[i]}','${userId}',${60 * (i + 1)},true,${times[i]} - interval '1 minute',${times[i]})`)
    sql(`INSERT INTO public.tasks(id,user_id,title,due_date) VALUES('${ids[4]}','${userId}','timezone-boundary-task','${day}')`)
    await page.goto("/pomodoro")
    await expect(page.locator("article").filter({ hasText: "Sessions today" }).locator("p").last()).toHaveText("2")
    await expect(page.locator("article").filter({ hasText: "Focus minutes today" }).locator("p").last()).toHaveText("5")
    await page.goto("/dashboard")
    await expect(page.getByText("2 sessions logged", { exact: true }).filter({ visible: true }).first()).toBeVisible()
    await expect(page.getByText("5m", { exact: true }).filter({ visible: true }).first()).toBeVisible()
    await page.goto("/tasks")
    const task = page.getByRole("heading", { name: "timezone-boundary-task", exact: true })
    await expect(task).toBeVisible()
    await expect(task.locator("xpath=ancestor::section[1]").locator("header")).toContainText("Today")
    await page.goto("/analytics?range=7d")
    const table = page.getByRole("table", { name: "Focus time", exact: true })
    await expect(table.locator("tbody tr").last()).toContainText("5 min")
    const captured = sql(`SELECT json_agg(row_to_json(s)) FROM (SELECT duration,completed,started_at,ended_at FROM public.pomodoro_sessions WHERE id IN (${ids.slice(0,4).map((id) => `'${id}'`).join(",")}) ORDER BY duration) s`)
    await mkdir("e2e/.cache", { recursive: true })
    await writeFile("e2e/.cache/timezone-sessions.json", captured)
    expect(sql(`SELECT due_date = '${day}'::date FROM public.tasks WHERE id='${ids[4]}'`)).toBe("t")
  } finally {
    try { if (original) { await settings(page); await saveZone(page, original) } } finally {
      sql(`DELETE FROM public.pomodoro_sessions WHERE id IN (${ids.slice(0,4).map((id) => `'${id}'`).join(",")}); DELETE FROM public.tasks WHERE id='${ids[4]}'`)
      await context.close()
    }
  }
})

test("spec04 S3: New York DST fixtures use the saved account calendar in reports", async ({ browser }) => {
  const context = await browser.newContext({ storageState: authState('a'), timezoneId: "Asia/Tokyo" })
  const page = await context.newPage()
  const ids = [randomUUID(), randomUUID()]
  let original: string | undefined
  try {
    const userId = await owner(page)
    original = await settings(page)
    await saveZone(page, "America/New_York")
    // Nov 1 is the 25-hour fall-back day: its midnight is 04:00 UTC.
    for (const [i, timestamp] of ["2026-11-01T03:59:59.999Z", "2026-11-01T04:00:00Z"].entries()) {
      sql(`INSERT INTO public.pomodoro_sessions(id,user_id,duration,completed,started_at,ended_at) VALUES('${ids[i]}','${userId}',${60 * (i + 1)},true,'${timestamp}'::timestamptz - interval '1 minute','${timestamp}')`)
    }
    await page.goto("/analytics?range=all")
    const table = page.getByRole("table", { name: "Focus time", exact: true })
    await expect(table.getByRole("row").filter({ hasText: "OCT 2026" })).toHaveText("OCT 20261 min")
    await expect(table.getByRole("row").filter({ hasText: "NOV 2026" })).toHaveText("NOV 20262 min")
    expect(sql("SELECT extract(epoch FROM (('2026-03-09'::timestamp AT TIME ZONE 'America/New_York') - ('2026-03-08'::timestamp AT TIME ZONE 'America/New_York')))/3600")).toBe("23.0000000000000000")
    expect(sql("SELECT extract(epoch FROM (('2026-11-02'::timestamp AT TIME ZONE 'America/New_York') - ('2026-11-01'::timestamp AT TIME ZONE 'America/New_York')))/3600")).toBe("25.0000000000000000")
  } finally {
    try { if (original) { await settings(page); await saveZone(page, original) } } finally {
      sql(`DELETE FROM public.pomodoro_sessions WHERE id IN ('${ids[0]}','${ids[1]}')`)
      await context.close()
    }
  }
})
