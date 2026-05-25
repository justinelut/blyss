import { Skeleton } from '@/design'

/**
 * Loading skeleton for /creators/[slug].
 *
 * Per plan §6.13 + §3.4: surface-sunken pulse blocks (NOT animated grey
 * rectangles) sized to the storefront's structural rhythm — banner +
 * identity overlay + tabs strip + 4-col product grid.
 */
export default function Loading() {
  return (
    <div className="bg-[var(--background)]">
      {/* Banner skeleton — 16:9 */}
      <div className="relative">
        <Skeleton aspectRatio="16/9" className="w-full" />

        {/* Identity overlay — avatar + name lines */}
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-[1280px] px-6 pb-10 md:px-16 md:pb-14">
            <div className="flex items-end gap-5">
              <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full bg-[var(--surface-sunken)] ring-2 ring-[var(--background)] md:h-[88px] md:w-[88px]" />
              <div className="flex flex-col gap-3 pb-1">
                <Skeleton className="h-9 w-56 md:h-12 md:w-72" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-72" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab strip skeleton */}
      <div className="border-b border-[var(--border)]">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-6 px-6 md:px-16">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>

      {/* Product grid skeleton — 4-col on desktop */}
      <div className="mx-auto max-w-[1280px] px-6 py-12 md:px-16 md:py-16">
        <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-4">
              <Skeleton aspectRatio="4/5" className="w-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
