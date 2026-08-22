import { BrandMark } from "@/components/brand/brand-mark"

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-xl bg-muted motion-safe:animate-pulse motion-reduce:animate-none ${className}`}
      aria-hidden="true"
    />
  )
}

export function RouteLoading() {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="relative">
          <BrandMark showLabel={false} />
          <span
            className="absolute -right-1 -top-1 size-3 rounded-full bg-primary motion-safe:animate-pulse motion-reduce:animate-none"
            aria-hidden="true"
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Loading your study space...</p>
          <p className="text-xs text-muted-foreground">Getting the next page ready.</p>
        </div>
      </div>

      <section className="space-y-3">
        <SkeletonBlock className="h-8 max-w-64" />
        <SkeletonBlock className="h-4 max-w-96" />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="hidden h-28 xl:block" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
        <SkeletonBlock className="h-72" />
        <div className="space-y-3">
          <SkeletonBlock className="h-20" />
          <SkeletonBlock className="h-20" />
          <SkeletonBlock className="h-20" />
        </div>
      </section>
    </div>
  )
}
