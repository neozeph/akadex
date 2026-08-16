import Image from "next/image"
import { ImageIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type ScreenshotFrameProps = {
  /** Public path, e.g. "/screenshots/dashboard.webp". */
  src: string
  alt: string
  /** Shown in the placeholder when the file hasn't been supplied yet. */
  label: string
  /** Whether the asset actually exists on disk — checked server-side by the caller. */
  hasImage: boolean
  className?: string
  priority?: boolean
  /** Render without the browser-chrome dots bar (used by the full-size lightbox view). */
  chrome?: boolean
}

/**
 * Browser-chrome-styled frame for a product screenshot. Purely
 * presentational — asset existence is resolved server-side (fs.existsSync,
 * same technique as before) by the caller and passed in as `hasImage`, so
 * this component has no Node dependency and can be composed inside client
 * trees (the screenshot stack, the lightbox) without a server/client
 * boundary violation. A missing asset renders an honest, clearly-labeled
 * placeholder instead of a broken `<img>`.
 */
export function ScreenshotFrame({
  src,
  alt,
  label,
  hasImage,
  className,
  priority = false,
  chrome = true,
}: ScreenshotFrameProps) {
  return (
    <figure
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_70px_-40px_rgba(15,23,42,0.45)]",
        className,
      )}
    >
      {chrome ? (
        <div className="flex items-center gap-1.5 border-b border-border bg-muted/60 px-3 py-2">
          <span aria-hidden="true" className="size-2.5 rounded-full bg-terracotta/60" />
          <span aria-hidden="true" className="size-2.5 rounded-full bg-highlight/60" />
          <span aria-hidden="true" className="size-2.5 rounded-full bg-primary/60" />
        </div>
      ) : null}

      <div
        className={cn(
          "relative mx-auto bg-muted/40",
          chrome ? "aspect-[16/10] h-full w-full" : "aspect-[16/10] max-h-[70vh] w-full sm:aspect-[16/9]",
        )}
      >
        {hasImage ? (
          <Image
            src={src}
            alt={alt}
            fill
            priority={priority}
            sizes={chrome ? "(min-width: 1024px) 640px, 90vw" : "(min-width: 1024px) 1024px, 95vw"}
            className={cn("object-top", chrome ? "object-cover" : "object-contain")}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <ImageIcon aria-hidden="true" className="size-6 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">Screenshot needed: {label}</p>
            <p className="text-[0.7rem] text-muted-foreground/70">{src}</p>
          </div>
        )}
      </div>
    </figure>
  )
}
