'use client'

import { Organization } from '@polar-sh/sdk'
import { CreatorCard } from './CreatorCard'

interface CreatorsGridProps {
  creators: Organization[]
  /** Called when a creator card's Tip affordance is clicked. */
  onTip?: (creator: Organization) => void
}

/** Read tipping_enabled off the org (may be absent on the SDK type). */
function isTipEnabled(creator: Organization): boolean {
  return (creator as any).tipping_enabled === true
}

export function CreatorsGrid({ creators, onTip }: CreatorsGridProps) {
  if (creators.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-on-surface-variant">No creators found.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:gap-12 md:grid-cols-2 lg:grid-cols-3">
      {creators.map((creator, index) => (
        <CreatorCard
          key={creator.id}
          creator={creator}
          offsetClass={index % 3 === 1 ? 'md:mt-12' : ''}
          tipEnabled={isTipEnabled(creator)}
          onTip={onTip}
        />
      ))}
    </div>
  )
}
