'use client'

import { useMemo } from 'react'
import { useQueryState } from 'nuqs'
import { schemas } from '@/lib/api'
import { CreatorsHero } from '@/components/Marketplace/CreatorsHero'
import { FeaturedCreatorSpotlight } from '@/components/Marketplace/FeaturedCreatorSpotlight'
import { CreatorsGrid } from '@/components/Marketplace/CreatorsGrid'
import { useCreatorCategories } from '@/hooks/queries/creators'
import { Eyebrow, typography } from '@/design'
import { cn } from '@/lib/utils'

interface CreatorsDirectoryPageProps {
  /** Server-rendered initial creator list */
  initialCreators: schemas['Organization'][]
  /** The featured-spotlight creator (from is_featured_spotlight flag) */
  featuredSpotlight?: schemas['Organization'] | null
  /** Top product from the spotlight creator */
  spotlightTopProduct?: schemas['Product'] | null
}

/**
 * CreatorsDirectoryPage — client wrapper for /creators.
 *
 * Per plan §6.3:
 * - Hero with eyebrow + headline + filter strip (URL state via nuqs)
 * - Featured spotlight (1 large editorial card) — full bleed below hero
 * - Creator grid (12 cards 3×4)
 *
 * Categories are backoffice-managed and fetched from /v1/creator-categories.
 * Filtering matches a creator's real `creator_category` slug. The "All" tab is
 * a UI-only value handled here.
 */
export function CreatorsDirectoryPage({
  initialCreators,
  featuredSpotlight,
  spotlightTopProduct,
}: CreatorsDirectoryPageProps) {
  const { data: categories = [] } = useCreatorCategories()

  // URL state — a free-form category slug or "all". Validated against the
  // fetched category list (falls back to "all" for unknown values).
  const [activeRaw, setActive] = useQueryState('craft', {
    defaultValue: 'all',
  })
  const active =
    activeRaw === 'all' || categories.some((c) => c.slug === activeRaw)
      ? activeRaw
      : 'all'

  const filtered = useMemo(() => {
    if (active === 'all') return initialCreators
    return initialCreators.filter(
      (c: any) => (c.creator_category ?? null) === active,
    )
  }, [initialCreators, active])

  const activeLabel =
    categories.find((c) => c.slug === active)?.name ?? active

  return (
    <div className="bg-[var(--background)] text-[var(--text-primary)]">
      <CreatorsHero
        active={active}
        onChange={(next) => setActive(next)}
        total={filtered.length}
        categories={categories}
      />

      {/* Featured spotlight — only when one is provided + we're on All */}
      {featuredSpotlight && active === 'all' && (
        <FeaturedCreatorSpotlight
          creator={featuredSpotlight}
          topProduct={spotlightTopProduct ?? undefined}
        />
      )}

      {/* Grid section */}
      <section className="bg-[var(--background)]">
        <div className="mx-auto max-w-[1280px] px-6 py-16 md:px-16 md:py-24">
          {filtered.length > 0 ? (
            <>
              {active !== 'all' && (
                <div className="mb-8">
                  <Eyebrow>{activeLabel}</Eyebrow>
                  <h2
                    className={cn(
                      typography.h2,
                      'mt-3 text-[var(--text-primary)]',
                    )}
                  >
                    {filtered.length} {filtered.length === 1 ? 'maker' : 'makers'}
                  </h2>
                </div>
              )}
              <CreatorsGrid creators={filtered} />
            </>
          ) : (
            <div className="flex max-w-[44ch] flex-col items-start py-12">
              <h2
                className={cn(typography.h3, 'text-[var(--text-primary)]')}
              >
                No creators in that craft yet.
              </h2>
              <p className={cn(typography.body, 'mt-4 text-[var(--text-secondary)]')}>
                The roster is growing weekly. Try a different craft above, or
                browse all makers.
              </p>
              <button
                type="button"
                onClick={() => setActive('all')}
                className="mt-8 inline-flex h-11 items-center justify-center rounded-md bg-[var(--accent)] px-6 font-sans text-[14px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
              >
                See all makers
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
