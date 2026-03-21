'use client'

import { Organization } from '@polar-sh/sdk'
import { CreatorCard } from './CreatorCard'

interface CreatorsGridProps {
  creators: Organization[]
}

export function CreatorsGrid({ creators }: CreatorsGridProps) {
  if (creators.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-on-surface-variant">No creators found.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-3">
      {creators.map((creator, index) => (
        <CreatorCard
          key={creator.id}
          creator={creator}
          offsetClass={index % 3 === 1 ? 'md:mt-12' : ''}
        />
      ))}
    </div>
  )
}
