import { existsSync } from "node:fs"
import path from "node:path"

import { ScreenshotGallery } from "@/components/landing/ScreenshotGallery"
import type { ScreenshotItem } from "@/components/landing/ScreenshotGallery"

const SCREENSHOTS: Omit<ScreenshotItem, "hasImage">[] = [
  {
    id: "dashboard",
    src: "/screenshots/dashboard.webp",
    alt: "Akadex dashboard showing overall GWA, pending tasks, and today's focus summary",
    label: "Dashboard",
  },
  {
    id: "tasks",
    src: "/screenshots/tasks.webp",
    alt: "Akadex weekly task planner with tasks organized by due date",
    label: "Tasks",
  },
  {
    id: "semesters",
    src: "/screenshots/semesters.webp",
    alt: "Akadex semester hub showing subject cards with grades and active task counts",
    label: "Semester Hub",
  },
  {
    id: "analytics",
    src: "/screenshots/analytics.webp",
    alt: "Akadex analytics page showing GWA by semester and grade distribution charts",
    label: "Analytics",
  },
]

function screenshotExists(publicPath: string) {
  try {
    return existsSync(path.join(process.cwd(), "public", publicPath.replace(/^\//, "")))
  } catch {
    return false
  }
}

/**
 * Stacked product-screenshot gallery — a dominant front screenshot
 * (Dashboard) with the other three peeking out behind it at a controlled
 * offset. Clicking any card (front or partially-visible) opens a lightbox
 * on that exact screenshot. Existence of each asset is checked here
 * server-side (fs.existsSync) so a missing file renders an honest
 * placeholder rather than a broken image — the same technique used
 * elsewhere in the app, just resolved once and passed down as plain data
 * since the interactive stack/lightbox has to be a client component.
 */
export function ProductScreenshots() {
  const screenshots: ScreenshotItem[] = SCREENSHOTS.map((screenshot) => ({
    ...screenshot,
    hasImage: screenshotExists(screenshot.src),
  }))

  return (
    <section
      id="product"
      className="scroll-mt-24 px-4 py-16 sm:px-6 lg:px-8 lg:py-20"
    >
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <p className="font-accent text-xs font-semibold tracking-[0.32em] text-primary uppercase">
            Inside Akadex
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Everything you need, without jumping between apps.
          </h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            See your tasks, academic progress, focus sessions, and analytics in
            one workspace built around student life.
          </p>
        </div>

        <div className="mt-12">
          <ScreenshotGallery screenshots={screenshots} />
        </div>
      </div>
    </section>
  )
}
