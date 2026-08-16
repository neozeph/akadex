"use client"

import { useEffect, useRef, useState } from "react"
import type { KeyboardEvent as ReactKeyboardEvent } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Reveal } from "@/components/landing/Reveal"
import { ScreenshotFrame } from "@/components/landing/ScreenshotFrame"
import { cn } from "@/lib/utils"

export type ScreenshotItem = {
  id: string
  src: string
  alt: string
  label: string
  hasImage: boolean
}

type ScreenshotGalleryProps = {
  screenshots: ScreenshotItem[]
}

/**
 * Stacked screenshot composition + click-to-open lightbox. The stack's
 * positioning lives in globals.css (`.screenshot-stack-item`) rather than
 * inline styles/Tailwind arbitrary values, so it scales smoothly across
 * breakpoints via clamp() instead of needing per-index responsive classes.
 *
 * The viewer is a single controlled Dialog shared by every stack item
 * (rather than one Dialog-per-item) so navigation can move between
 * screenshots without unmounting/remounting the dialog. Because it's one
 * shared Dialog opened from four different buttons (not a single
 * Dialog.Trigger), Radix's built-in "restore focus to the trigger" doesn't
 * reliably know which of the four to return to — so focus restoration is
 * handled explicitly here: `restoreIndexRef` tracks whichever screenshot is
 * currently displayed (independent of the `openIndex` state that gets
 * cleared on close), and a `useEffect` keyed on `openIndex` refocuses that
 * trigger button once the dialog actually closes.
 */
export function ScreenshotGallery({ screenshots }: ScreenshotGalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const triggerRefs = useRef<Array<HTMLButtonElement | null>>([])
  const restoreIndexRef = useRef<number | null>(null)

  const count = screenshots.length
  const goTo = (index: number) => {
    const normalized = ((index % count) + count) % count
    restoreIndexRef.current = normalized
    setOpenIndex(normalized)
  }
  const showPrevious = () =>
    setOpenIndex((current) => {
      if (current === null) return current
      const next = (current - 1 + count) % count
      restoreIndexRef.current = next
      return next
    })
  const showNext = () =>
    setOpenIndex((current) => {
      if (current === null) return current
      const next = (current + 1) % count
      restoreIndexRef.current = next
      return next
    })

  useEffect(() => {
    if (openIndex === null && restoreIndexRef.current !== null) {
      triggerRefs.current[restoreIndexRef.current]?.focus()
      restoreIndexRef.current = null
    }
  }, [openIndex])

  const handleViewerKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault()
      showPrevious()
    } else if (event.key === "ArrowRight") {
      event.preventDefault()
      showNext()
    }
  }

  const active = openIndex !== null ? screenshots[openIndex] : null

  return (
    <>
      <div className="screenshot-stack relative mx-auto max-w-2xl">
        <div className="pb-16 pl-12 sm:pb-20 sm:pl-16 lg:pb-28 lg:pl-24">
          <div className="relative isolate aspect-[16/10]">
            {screenshots.map((screenshot, index) => (
              <div
                key={screenshot.id}
                data-stack-index={index}
                className="screenshot-stack-item absolute inset-0 h-full w-full"
                style={{ zIndex: count - index }}
              >
                <Reveal delayMs={index * 80} className="h-full w-full">
                  <button
                    ref={(el) => {
                      triggerRefs.current[index] = el
                    }}
                    type="button"
                    onClick={() => goTo(index)}
                    aria-label={`View ${screenshot.label} screenshot`}
                    className={cn(
                      "block h-full w-full rounded-2xl text-left transition-[border-color] duration-200",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      index === 0 && "hover:[&_figure]:border-primary/50",
                    )}
                  >
                    <ScreenshotFrame
                      src={screenshot.src}
                      alt={screenshot.alt}
                      label={screenshot.label}
                      hasImage={screenshot.hasImage}
                      priority={index === 0}
                      className="pointer-events-none h-full"
                    />
                  </button>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={active !== null} onOpenChange={(open) => !open && setOpenIndex(null)}>
        <DialogContent
          onKeyDown={handleViewerKeyDown}
          onCloseAutoFocus={(event) => event.preventDefault()}
          className="max-w-3xl gap-4 border-border bg-card p-4 sm:p-6"
          showCloseButton={false}
        >
          {active ? (
            <>
              {/* A locally-sized Close (44px hit target) rather than the shared
                  dialog.tsx primitive's ~24px one — that primitive is reused by
                  every dialog in the authenticated app, so it's left untouched;
                  this owns the top-right corner alone, and the title reserves
                  matching space on its right so long labels wrap before ever
                  reaching it, instead of the two overlapping. */}
              <button
                type="button"
                onClick={() => setOpenIndex(null)}
                aria-label="Close screenshot viewer"
                className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-full text-muted-foreground opacity-70 transition hover:bg-muted hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <X className="size-4" />
              </button>

              <DialogTitle className="pr-14 text-base font-semibold text-foreground sm:pr-16 sm:text-lg">
                {active.label}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {`Screenshot ${(openIndex ?? 0) + 1} of ${count}: ${active.label}. Use the arrow buttons or arrow keys to browse.`}
              </DialogDescription>

              {/* Previous/Next flank the image as flex siblings (not absolutely
                  positioned over it), so they never cover screenshot content and
                  never share a corner with Close. Desktop/tablet: side-by-side.
                  Mobile: hidden here, moved into the bottom control row below so
                  the image keeps full width on narrow screens. */}
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={showPrevious}
                  aria-label="Previous screenshot"
                  className="hidden size-11 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:flex"
                >
                  <ChevronLeft className="size-5" />
                </button>

                <div className="min-w-0 flex-1">
                  <ScreenshotFrame
                    src={active.src}
                    alt={active.alt}
                    label={active.label}
                    hasImage={active.hasImage}
                    chrome={false}
                    priority
                  />
                </div>

                <button
                  type="button"
                  onClick={showNext}
                  aria-label="Next screenshot"
                  className="hidden size-11 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:flex"
                >
                  <ChevronRight className="size-5" />
                </button>
              </div>

              <div className="flex items-center justify-center gap-4 sm:block">
                <button
                  type="button"
                  onClick={showPrevious}
                  aria-label="Previous screenshot"
                  className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:hidden"
                >
                  <ChevronLeft className="size-5" />
                </button>

                <p className="text-center text-xs font-medium text-muted-foreground">
                  {(openIndex ?? 0) + 1} / {count}
                </p>

                <button
                  type="button"
                  onClick={showNext}
                  aria-label="Next screenshot"
                  className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:hidden"
                >
                  <ChevronRight className="size-5" />
                </button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
