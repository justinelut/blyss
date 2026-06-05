'use client'

import { useState } from 'react'
import Link from 'next/link'
import { schemas } from '@/lib/api'
import { Eyebrow, SectionDivider, typography } from '@/design'
import { MarketplaceCreatorCard } from './MarketplaceCreatorCard'
import { DonationModal } from '@/components/Donation/DonationModal'
import { cn } from '@/lib/utils'

interface FeaturedCreatorsProps {
  creators: schemas['Organization'][]
}

/**
 * FeaturedCreators — 4 tall creator cards (4:5 aspect).
 *
 * Per plan §6.1 step 5. Edited via `is_featured` flag on organizations.
 * Cards with tipping_enabled surface a Tip affordance that opens the shared
 * inline DonationModal (no navigation).
 */
export const FeaturedCreators = ({ creators }: FeaturedCreatorsProps) => {
  const [tipTarget, setTipTarget] = useState<schemas['Organization'] | null>(
    null,
  )

  if (!creators?.length) return null

  return (
    <SectionDivider tone="default" density="lg">
      <div className="mb-12 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Eyebrow>Meet the makers</Eyebrow>
          <h2 className={cn(typography.h2, 'mt-3 text-[var(--text-primary)]')}>
            Kenya&rsquo;s creative class, online.
          </h2>
        </div>
        <Link
          href="/creators"
          className="font-sans text-sm text-[var(--text-secondary)] underline-offset-4 transition-colors hover:text-[var(--accent)] hover:underline"
        >
          All creators →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
        {creators.slice(0, 4).map((creator) => (
          <MarketplaceCreatorCard
            key={creator.id}
            creator={creator}
            variant="tall"
            onTip={(c) => setTipTarget(c)}
          />
        ))}
      </div>

      {/* Shared donation modal — a single instance reused by every card. */}
      <DonationModal
        isOpen={!!tipTarget}
        onClose={() => setTipTarget(null)}
        creatorSlug={(tipTarget as any)?.slug ?? ''}
        creatorName={tipTarget?.name ?? 'this creator'}
      />
    </SectionDivider>
  )
}
