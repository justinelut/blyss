'use client'

import { schemas } from '@/lib/api'
import { MarketplaceCreatorCard } from './MarketplaceCreatorCard'
import { Skeleton, StaggerList, StaggerItem } from '@/design'

interface CreatorsGridProps {
  creators: schemas['Organization'][]
  isLoading?: boolean
  loadingCount?: number
}

/**
 * CreatorsGrid — 12 cards 3×4 desktop / 2×6 tablet / 1-col mobile.
 * Stagger reveal on scroll-into-view.
 */
export const CreatorsGrid = ({
  creators,
  isLoading,
  loadingCount = 12,
}: CreatorsGridProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: loadingCount }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <Skeleton aspectRatio="4/5" className="w-full" />
            <Skeleton className="h-5 w-3/4 mt-1" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <StaggerList className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {creators.map((creator) => (
        <StaggerItem key={creator.id}>
          <MarketplaceCreatorCard creator={creator} variant="tall" />
        </StaggerItem>
      ))}
    </StaggerList>
  )
}
