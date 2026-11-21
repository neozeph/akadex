import { authState } from "./ci-auth.ts"
import { test, expect, type Page, type BrowserContext } from "@playwright/test"
import { access, mkdir, readFile, writeFile } from "node:fs/promises"
import { randomUUID } from "node:crypto"
import { execFileSync } from "node:child_process"
import { E2E_APP_URL } from "./environment.ts"
import { recordSample, summarizeSamples, type Sample } from "./measurements.ts"

type Dataset = { prefix: string; semesterPath: string | null; tasks: string[] }

function denyDashboardSubjects() {
  // This fixed container belongs exclusively to the guarded local E2E project.
  const execute = (sql: string) => execFileSync("docker", ["exec", "supabase_db_akadex-e2e", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-At", "-c", sql], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
  if (execute("SELECT has_table_privilege('authenticated', 'public.subjects', 'SELECT')").trim() !== "t") throw new Error("Unexpected existing subjects permissions. No grants changed.")
  execute("REVOKE SELECT ON public.subjects FROM authenticated")
  let outstanding = true
  return () => {
    if (!outstanding) return
    execute("GRANT SELECT ON public.subjects TO authenticated")
    outstanding = false
  }
}

async function ready(page: Page, path: string, heading?: string) {
  const response = await page.goto(path)
  expect(response?.ok(), "Navigation must succeed, not produce a failed timing sample").toBe(true)
  expect(new URL(page.url()).pathname, "Session expired. Run npm run e2e:setup and sign in manually.").not.toMatch(/login|register/)
  await expect(page).toHaveURL(new URL(path, E2E_APP_URL).href)
  await expect(page.getByRole("heading", { level: 1, ...(heading ? { name: heading, exact: true } : {}) })).toBeVisible()
}

test.beforeAll(async () => {
  for (const account of ["a", "b"] as const) {
    try { await access(authState(account)) } catch { throw new Error("Local account state is missing. Run manual setup or the explicitly authorized CI setup.") }
  }
})

async function accountPage(context: BrowserContext) {
  const page = await context.newPage()
  await ready(page, "/dashboard")
  return page
}

async function journal(data: Dataset) {
  await mkdir("e2e/.cache", { recursive: true })
  await writeFile(`e2e/.cache/cleanup-${data.prefix}.json`, JSON.stringify({ ...data, complete: false }, null, 2))
}

async function toggleTask(page: Page, title: string, completed: boolean) {
  const checkbox = page.getByRole("checkbox", { name: `Mark ${title} as ${completed ? "complete" : "incomplete"}`, exact: true })
  const submitted = page.waitForResponse((response) => response.request().method() === "POST" && Boolean(response.request().headers()["next-action"]))
  await checkbox.locator("..").click()
  expect((await submitted).ok()).toBe(true)
  await expect(page.getByRole("heading", { name: title, exact: true })).toHaveCount(0)
}

async function interactiveTasks(page: Page) {
  // A heading can arrive before client hydration. Prove an actual client state
  // transition before measuring a mutation, without an arbitrary delay.
  await page.getByRole("button", { name: "Add Task", exact: true }).first().click()
  const dialog = page.getByRole("dialog", { name: "New task", exact: true })
  await expect(dialog).toBeVisible()
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click()
  await expect(dialog).toBeHidden()
}

async function seed(page: Page, data: Dataset) {
  await journal(data)
  const captured: { subjects: Array<{ units: string; grade: string }>; tasks: Array<{ status: string }> } = JSON.parse(await readFile("e2e/fixtures/baseline-data.json", "utf8"))
  await ready(page, "/semesters", "Semesters")
  await expect(page.locator('a[href^="/semesters/"]'), "Use empty disposable accounts. Existing records are not deleted automatically.").toHaveCount(0)
  await page.getByRole("button", { name: "Add Semester", exact: true }).click()
  const semesterDialog = page.getByRole("dialog", { name: "New semester" })
  await semesterDialog.getByLabel("Year Level").selectOption("6")
  await semesterDialog.getByLabel("Semester", { exact: true }).selectOption("summer")
  await semesterDialog.getByRole("button", { name: "Save semester", exact: true }).click()
  await expect(semesterDialog).toBeHidden()
  const link = page.locator('a[href^="/semesters/"]')
  await expect(link).toHaveCount(1)
  data.semesterPath = await link.getAttribute("href")
  await journal(data)
  expect(data.semesterPath).toMatch(/^\/semesters\/[a-f0-9-]+$/)
  await link.click()
  for (const [index, subject] of captured.subjects.entries()) {
    const code = `${data.prefix}-${index === 0 ? "A" : "B"}`
    const { units, grade } = subject
    await page.getByRole("button", { name: "Add Subject", exact: true }).first().click()
    const dialog = page.getByRole("dialog", { name: "Add subject", exact: true })
    await dialog.getByLabel("Subject code", { exact: true }).fill(code)
    await dialog.getByLabel("Subject name", { exact: true }).fill(code)
    await dialog.getByLabel("Units", { exact: true }).fill(units)
    await dialog.getByLabel("Grade", { exact: true }).selectOption(grade)
    await dialog.getByRole("button", { name: "Save subject", exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByRole("link", { name: `Open ${code} — ${code}`, exact: true })).toBeVisible()
  }
  await ready(page, "/tasks", "Tasks")
  await expect(page.locator("article[data-no-drag-scroll]")).toHaveCount(0)
  for (let index = 0; index < captured.tasks.length; index++) {
    const title = `${data.prefix}-TASK-${index + 1}`
    // Record attempted names before submission so interrupted writes are cleaned up.
    data.tasks.push(title)
    await journal(data)
    await page.getByRole("button", { name: "Add Task", exact: true }).first().click()
    const dialog = page.getByRole("dialog", { name: "New task", exact: true })
    await dialog.getByLabel("Task title", { exact: true }).fill(title)
    await dialog.getByRole("combobox", { name: "Subject", exact: true }).click()
    await page.getByRole("option", { name: new RegExp(`${data.prefix}-A`) }).click()
    await dialog.getByRole("button", { name: "Save task", exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible()
  }
  for (const title of data.tasks.filter((_, index) => captured.tasks[index].status === "done")) {
    await toggleTask(page, title, true)
  }
  await ready(page, "/dashboard")
  await expect(page.getByRole("article").filter({ has: page.getByText("Overall GWA", { exact: true }) })).toContainText("1.75")
  await expect(page.getByRole("article").filter({ has: page.getByText("Units completed", { exact: true }) })).toContainText("4.0")
  const tasks = page.getByRole("article").filter({ has: page.getByText("Pending tasks", { exact: true }) })
  await expect(tasks.locator("p").nth(1)).toHaveText("6")
  await expect(tasks).toContainText("2 completed")
}

async function cleanup(page: Page, data: Dataset) {
  await mkdir("e2e/.cache", { recursive: true })
  // Retain only test-run metadata if cleanup is interrupted. Never store auth here.
  const file = `e2e/.cache/cleanup-${data.prefix}.json`
  // The manifest already exists before the first write. Teardown must not depend on report I/O.
  for (const status of ["", "?status=done"]) {
    await ready(page, `/tasks${status}`, "Tasks")
    for (const title of data.tasks) {
      const remove = page.getByRole("button", { name: `Delete ${title}`, exact: true })
      if (!await remove.count()) continue
      await remove.click()
      const dialog = page.getByRole("alertdialog")
      await dialog.getByRole("button", { name: "Delete task", exact: true }).click()
      await expect(dialog).toBeHidden()
      await expect(page.getByRole("heading", { name: title, exact: true })).toHaveCount(0)
    }
  }
  if (data.semesterPath) {
    await ready(page, "/semesters", "Semesters")
    const ownLink = page.locator(`a[href="${data.semesterPath}"]`)
    if (await ownLink.count()) {
      const card = ownLink.locator("..")
      await card.getByRole("button", { name: /^Delete / }).click()
      const dialog = page.getByRole("alertdialog")
      await dialog.getByRole("button", { name: "Delete semester", exact: true }).click()
      await expect(dialog).toBeHidden()
      await expect(ownLink).toHaveCount(0)
    }
  }
  await writeFile(file, JSON.stringify({ prefix: data.prefix, complete: true }))
}

test("story 1: isolated real writes, hand-derived totals, and two-account separation", async ({ browser }) => {
  const a = await browser.newContext({ storageState: authState('a') })
  const b = await browser.newContext({ storageState: authState('b') })
  const page = await accountPage(a)
  await accountPage(b)
  const data: Dataset = { prefix: `E2E-${randomUUID().slice(0, 8).toUpperCase()}`, semesterPath: null, tasks: [] }
  try {
    await seed(page, data)
    const other = await accountPage(b)
    await ready(other, "/tasks", "Tasks")
    await expect(other.getByText(data.tasks[0], { exact: true })).toHaveCount(0)
    await ready(other, "/semesters", "Semesters")
    await expect(other.locator('a[href^="/semesters/"]')).toHaveCount(0)
    await ready(page, "/analytics?range=7d", "Analytics")
    await expect(page.getByText("Completed (7 days)", { exact: true }).filter({ visible: true }).locator("..").locator("dd")).toHaveText("2")
  } finally {
    try { await cleanup(page, data) } finally { await a.close(); await b.close() }
  }
})

test("story 3: completion survives reload and failed navigation is never readiness", async ({ browser }) => {
  const context = await browser.newContext({ storageState: authState('a') })
  const page = await accountPage(context)
  const data: Dataset = { prefix: `E2E-${randomUUID().slice(0, 8).toUpperCase()}`, semesterPath: null, tasks: [] }
  try {
    await seed(page, data)
    await ready(page, "/tasks?status=done", "Tasks")
    await expect(page.getByRole("heading", { name: data.tasks[6], exact: true })).toBeVisible()
    await context.setOffline(true)
    let navigationFailed = false
    const failed = await recordSample(async () => { await page.goto(`${E2E_APP_URL}/tasks?failed-read=1`) })
    navigationFailed = !failed.success
    expect(navigationFailed).toBe(true)
    expect(summarizeSamples([failed])).toMatchObject({ failed: 1, successful: 0 })
  } finally {
    await context.setOffline(false)
    try { await cleanup(page, data) } finally { await context.close() }
  }
  const expired = await browser.newContext({ storageState: authState('a') })
  await expired.clearCookies()
  try {
    const expiredPage = await expired.newPage()
    await expiredPage.goto(`${E2E_APP_URL}/dashboard`)
    await expect(expiredPage).toHaveURL(`${E2E_APP_URL}/login`)
  } finally { await expired.close() }
})

test("spec02 S1: successful empty dashboard remains a real empty state", async ({ browser }) => {
  const context = await browser.newContext({ storageState: authState('a') })
  try {
    const page = await accountPage(context)
    await expect(page.getByRole("heading", { name: "Dashboard unavailable", exact: true })).toHaveCount(0)
    await expect(page.getByRole("article").filter({ has: page.getByText("Overall GWA", { exact: true }) })).toContainText("No grades yet")
    await expect(page.getByRole("article").filter({ has: page.getByText("Pending tasks", { exact: true }) }).locator("p").nth(1)).toHaveText("0")
  } finally { await context.close() }
})

test("spec02 S2: partial database failure shows safe retryable error and keyboard focus", async ({ browser }) => {
  const context = await browser.newContext({ storageState: authState('a') })
  let restore: (() => void) | undefined
  let release = () => {}
  try {
    const page = await accountPage(context)
    restore = denyDashboardSubjects()
    expect(() => denyDashboardSubjects()).toThrow("Unexpected existing subjects permissions")
    await page.goto("/dashboard")
    const heading = page.getByRole("heading", { name: "Dashboard unavailable", exact: true })
    await expect(heading).toBeVisible()
    await expect(heading).toBeFocused()
    await expect(page.getByRole("article").filter({ has: page.getByText("Pending tasks", { exact: true }) })).toHaveCount(0)
    await expect(page.getByText(/permission denied|42501/)).toHaveCount(0)
    const retry = page.getByRole("button", { name: "Try again", exact: true })
    const gate = new Promise<void>((done) => { release = done })
    let arrived: () => void = () => {}
    const serverResponse = new Promise<void>((done) => { arrived = done })
    await page.route("**/dashboard?*", async (route) => {
      if (route.request().headers()["rsc"] !== "1") { await route.continue(); return }
      const response = await route.fetch()
      arrived()
      await gate
      await route.fulfill({ response })
    })
    await retry.focus()
    await retry.press("Enter")
    await serverResponse
    await expect(page.getByRole("button", { name: "Retrying...", exact: true })).toBeDisabled()
    await expect(page.locator('section[aria-labelledby="dashboard-error-heading"]')).toHaveAttribute("aria-busy", "true")
    release()
    await expect(heading).toBeVisible()
    await expect(retry).toBeEnabled()
    await retry.focus()
    await expect(retry).toBeFocused()
  } finally { release(); try { restore?.() } finally { await context.close() } }
})

test("spec02 S3: retry refetches recovered grades and tasks without document reload", async ({ browser }) => {
  const context = await browser.newContext({ storageState: authState('a') })
  const page = await accountPage(context)
  const data: Dataset = { prefix: `E2E-${randomUUID().slice(0, 8).toUpperCase()}`, semesterPath: null, tasks: [] }
  let restore: (() => void) | undefined
  try {
    await seed(page, data)
    restore = denyDashboardSubjects()
    await page.goto("/dashboard")
    await expect(page.getByRole("heading", { name: "Dashboard unavailable", exact: true })).toBeVisible()
    await page.evaluate(() => { document.documentElement.dataset.e2eRetry = "same-document" })
    restore()
    const retry = page.getByRole("button", { name: "Try again", exact: true })
    await retry.focus()
    await retry.press("Enter")
    await expect(page.getByRole("article").filter({ has: page.getByText("Overall GWA", { exact: true }) })).toContainText("1.75")
    const tasks = page.getByRole("article").filter({ has: page.getByText("Pending tasks", { exact: true }) })
    await expect(tasks.locator("p").nth(1)).toHaveText("6")
    await expect(tasks).toContainText("2 completed")
    await expect(page.getByRole("heading", { name: "Dashboard unavailable", exact: true })).toHaveCount(0)
    await expect(page.locator("html")).toHaveAttribute("data-e2e-retry", "same-document")
    await expect(page).toHaveURL(`${E2E_APP_URL}/dashboard`)
  } finally {
    try { restore?.() } finally { try { await cleanup(page, data) } finally { await context.close() } }
  }
})

test("story 2: cold-browser and warm baseline against real academic data", async ({ browser }) => {
  test.setTimeout(600_000)
  const context = await browser.newContext({ storageState: authState('a') })
  const otherContext = await browser.newContext({ storageState: authState('b') })
  await accountPage(otherContext)
  await otherContext.close()
  const page = await accountPage(context)
  const data: Dataset = { prefix: `E2E-${randomUUID().slice(0, 8).toUpperCase()}`, semesterPath: null, tasks: [] }
  const results: Array<Record<string, unknown>> = []
  try {
    await seed(page, data)
    for (const [flow, path, heading] of [
      ["dashboard", "/dashboard", undefined],
      ["task-filter", `/tasks?q=${data.prefix}-TASK-1`, "Tasks"],
      ["task-completion", "/tasks", "Tasks"],
      ["semester", data.semesterPath!, undefined],
      ["analytics-7d", "/analytics?range=7d", "Analytics"],
      ["analytics-30d", "/analytics?range=30d", "Analytics"],
    ] as const) {
      for (const temperature of ["cold-browser", "warm"]) {
        const samples: Sample[] = []
        let warm: BrowserContext | undefined
        if (temperature === "warm") {
          warm = await browser.newContext({ storageState: authState('a') })
          const warmPage = await warm.newPage()
          await ready(warmPage, path!, heading)
          if (flow === "task-completion") {
            await toggleTask(warmPage, data.tasks[0], true)
            await ready(warmPage, "/tasks?status=done", "Tasks")
            await toggleTask(warmPage, data.tasks[0], false)
          }
        }
        try {
          for (let index = 0; index < 20; index++) {
            const sampleContext = warm ?? await browser.newContext({ storageState: authState('a') })
            const samplePage = warm ? warm.pages()[0] : await sampleContext.newPage()
            const network: number[] = []
            const benchmark = `bench-${randomUUID().replaceAll("-", "")}`
            const isMeasuredRequest = (request: import("@playwright/test").Request) => request.isNavigationRequest() || (request.method() === "POST" && Boolean(request.headers()["next-action"]))
            const routeRequest = async (route: import("@playwright/test").Route) => {
              const request = route.request()
              const headers = { ...request.headers() }
              delete headers["x-akadex-benchmark"]
              if (isMeasuredRequest(request)) headers["x-akadex-benchmark"] = benchmark
              await route.continue({ headers })
            }
            const onFinished = (request: import("@playwright/test").Request) => {
              if (isMeasuredRequest(request) && request.timing().responseStart >= 0) network.push(request.timing().responseStart)
            }
            // Setup is outside the measured action and carries no benchmark header.
            if (flow === "task-completion") {
              await ready(samplePage, "/tasks", "Tasks")
              await interactiveTasks(samplePage)
            }
            await sampleContext.route("**/*", routeRequest)
            samplePage.on("requestfinished", onFinished)
            let metrics: Array<Record<string, unknown>> = []
            try {
              const sample = await recordSample(async () => {
                if (flow === "task-completion") await toggleTask(samplePage, data.tasks[0], true)
                else await ready(samplePage, path!, heading)
              }, async () => {
                // Remove correlation before verification/restoration requests.
                samplePage.removeListener("requestfinished", onFinished)
                await sampleContext.unroute("**/*", routeRequest)
                if (process.env.AKADEX_PERFORMANCE === "1") {
                  const expectedOperation = flow === "dashboard" ? "dashboard" : flow === "semester" ? "semester" : flow.startsWith("analytics") ? "activity-analytics" : "planner"
                  await expect.poll(async () => {
                    metrics = (await readFile("e2e/.cache/metrics.ndjson", "utf8")).split("\n").filter(Boolean).map((line) => JSON.parse(line).metric).filter((metric) => metric.benchmark === benchmark)
                    return metrics.some((metric) => metric.kind === "operation" && metric.operation === expectedOperation)
                  }, { timeout: 10_000 }).toBe(true)
                  expect(metrics.filter((metric) => metric.kind === "network" && !metric.success)).toHaveLength(0)
                }
                if (flow === "dashboard") await expect(samplePage.getByRole("article").filter({ has: samplePage.getByText("Overall GWA", { exact: true }) })).toContainText("1.75")
                if (flow === "semester") await expect(samplePage.getByRole("link", { name: new RegExp(`Open ${data.prefix}`) })).toHaveCount(2)
                if (flow === "task-filter") {
                  await expect(samplePage.getByRole("heading", { name: data.tasks[0], exact: true })).toBeVisible()
                  await expect(samplePage.locator("article[data-no-drag-scroll]")).toHaveCount(1)
                }
                if (flow.startsWith("analytics")) {
                  await expect(samplePage.getByText(`Completed (${flow === "analytics-7d" ? "7" : "30"} days)`, { exact: true }).filter({ visible: true }).locator("..").locator("dd")).toHaveText("2")
                }
                if (flow === "task-completion") {
                  await ready(samplePage, "/tasks?status=done", "Tasks")
                  await expect(samplePage.getByRole("checkbox", { name: `Mark ${data.tasks[0]} as incomplete`, exact: true })).toBeChecked()
                  await toggleTask(samplePage, data.tasks[0], false)
                }
              })
              if (!sample.success) {
                // Failures are observations, not zero-duration successes. Capture
                // their actual spans and restore state before collecting the next.
                await sampleContext.unroute("**/*", routeRequest)
                samplePage.removeListener("requestfinished", onFinished)
                metrics = (await readFile("e2e/.cache/metrics.ndjson", "utf8")).split("\n").filter(Boolean).map((line) => JSON.parse(line).metric).filter((metric) => metric.benchmark === benchmark)
                if (flow === "task-completion") {
                  await ready(samplePage, "/tasks?status=done", "Tasks")
                  const doneAtRecovery = await samplePage.getByRole("checkbox", { name: `Mark ${data.tasks[0]} as incomplete`, exact: true }).count() > 0
                  results.push({ flow, temperature, sample: index + 1, recovery: doneAtRecovery ? "task-done-at-recovery" : "task-active-at-recovery" })
                  if (doneAtRecovery) await toggleTask(samplePage, data.tasks[0], false)
                  await ready(samplePage, "/tasks", "Tasks")
                  await expect(samplePage.getByRole("heading", { name: data.tasks[0], exact: true })).toBeVisible()
                }
              }
              samples.push(sample)
              results.push({ flow, temperature, sample: index + 1, ...sample, metrics: process.env.AKADEX_PERFORMANCE === "1" ? metrics.map((metric) => { const copy = { ...metric }; delete copy.benchmark; return copy }) : null, queryCount: process.env.AKADEX_PERFORMANCE === "1" ? metrics.filter((metric) => metric.kind === "network").length : null, ttfbMs: network })
            } finally {
              await sampleContext.unroute("**/*", routeRequest)
              samplePage.removeListener("requestfinished", onFinished)
              if (!warm) await sampleContext.close()
            }
          }
        } finally {
          results.push({ flow, temperature, summary: summarizeSamples(samples) })
          await warm?.close()
        }
        expect(samples, "Every requested observation must be recorded, including failures").toHaveLength(20)
      }
    }
  } finally {
    try {
      await mkdir("e2e/.cache", { recursive: true })
      const build = await readFile(".next-e2e/BUILD_ID", "utf8")
      await writeFile(`e2e/.cache/baseline-${process.env.AKADEX_PERFORMANCE === "1" ? "instrumented" : "plain"}.json`, JSON.stringify({ schemaVersion: 1, build: build.trim(), sampleCountPerFlowAndTemperature: 20, dataset: { semesters: 1, subjects: 2, tasks: 8, active: 6, done: 2, gradedUnits: 4, gwa: 1.75 }, geography: "local Docker and browser only", coldMeaning: "fresh browser context; database/server not guaranteed cold", instrumentation: process.env.AKADEX_PERFORMANCE === "1", results }, null, 2))
    } finally { try { await cleanup(page, data) } finally { await context.close() } }
  }
})
