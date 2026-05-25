'use client'

import { schemas } from '@/lib/api'
import { MarketplaceProductCard } from './MarketplaceProductCard'
import { Skeleton, StaggerList, StaggerItem } from '@/design'

interface BrowseGridProps {
  products: schemas['Product'][]
  isLoading?: boolean
  /** When true, render N skeleton cards (used during pagination loading) */
  loadingCount?: number
}

/**
 * BrowseGrid — 4-col desktop / 3-col tablet / 2-col mobile.
 *
 * Per plan §6.2 + §3.4: same MarketplaceProductCard as home, generous gap-y
 * between rows so the editorial rhythm reads (not packed-grid feel).
 */
export const BrowseGrid = ({ products, isLoading, loadingCount = 12 }: BrowseGridProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-12">
        {Array.from({ length: loadingCount }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <Skeleton aspectRatio="4/5" className="w-full" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-5 w-1/3 mt-1" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <StaggerList className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-12">
      {products.map((product) => (
        <StaggerItem key={product.id}>
          <MarketplaceProductCard product={product} />
        </StaggerItem>
      ))}
    </StaggerList>
  )
}
