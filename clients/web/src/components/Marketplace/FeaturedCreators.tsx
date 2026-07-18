'use client'

import Link from './LocaleLink'
import { useRouter } from 'next/navigation'
import { schemas } from '@/lib/api'
import { Eyebrow, SectionDivider, typography } from '@/design'
import { MarketplaceCreatorCard } from './MarketplaceCreatorCard'
import { useCurrencyControls } from './CurrencyProvider'
import { cn } from '@/lib/utils'

interface FeaturedCreatorsProps {
  creators: schemas['Organization'][]
}

/**
 * FeaturedCreators — 4 tall creator cards (4:5 aspect).
 *
 * Per plan §6.1 step 5. Edited via `is_featured` flag on organizations.
 * Cards with tipping_enabled surface a Tip affordance that navigates to the
 * dedicated /donation/[slug] page (no inline modal — donation is now a
 * surface, not an overlay).
 */
export const FeaturedCreators = ({ creators }: FeaturedCreatorsProps) => {
  const router = useRouter()
  const { country } = useCurrencyControls()

  if (!creators?.length) return null

  const tipHref = (creator: schemas['Organization']) => {
    const slug = (creator as any)?.slug
    return slug ? `/${country}/donation/${slug}` : null
  }

  return (
    <SectionDivider tone="default" density="lg">
      <div className="mb-12 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Eyebrow>Meet the makers</Eyebrow>
          <h2 className={cn(typography.h2, 'mt-3 text-[var(--text-primary)]')}>
            Independent creators, online.
          </h2>
        </div>
        <Link
          href="/creators"
          className="font-sans text-sm text-[var(--text-secondary)] underline-offset-4 transition-colors hover:text-[var(--accent)] hover:underline"
        >
          All creators →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-6 sm:gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
        {creators.slice(0, 4).map((creator) => (
          <MarketplaceCreatorCard
            key={creator.id}
            creator={creator}
            variant="tall"
            onTip={(c) => {
              const href = tipHref(c)
              if (href) router.push(href)
            }}
          />
        ))}
      </div>
    </SectionDivider>
  )
}
