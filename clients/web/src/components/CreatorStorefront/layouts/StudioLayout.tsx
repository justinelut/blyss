'use client'

/**
 * StudioLayout — writers, researchers, technical-content creators.
 * Lab-notebook feel. Per plan §19.4.
 *
 * Differences from editorial:
 *   - No imagery in the hero. Pure type. The creator's wordmark
 *     itself IS the hero.
 *   - Numbered list for products instead of a card grid. Reads like
 *     a published index of work.
 *   - Each list row carries a short description — the page has a
 *     RSS / publication feel.
 */

import Link from 'next/link'

import { OptimizedImage } from '@/components/Image/OptimizedImage'
import { Eyebrow, typography } from '@/design'
import { schemas } from '@/lib/api'
import { cn } from '@/lib/utils'

import type {
  StorefrontHeroProps,
  StorefrontLayout,
  StorefrontWorkSectionProps,
} from './index'
import { HeroBio, HeroStatsLine } from './_shared'

const StudioHero: React.FC<StorefrontHeroProps> = ({
  name,
  slug,
  bio,
  bannerUrl,
  city,
  hasSubscriptions,
  tipEnabled,
  onSubscribeClick,
  onTipClick,
  productsCount = 0,
  totalOrders = 0,
  totalEarned = 0,
}) => (
  <header className="border-b border-[var(--border)] bg-[var(--background)]">
    {/* Banner — narrow 6:1 strip. Studio is text-led but a banner
        gives the page a moment of imagery before the index of
        work below. */}
    {bannerUrl && (
      <div className="relative h-[100px] w-full overflow-hidden bg-[var(--surface-sunken)] sm:h-[120px] md:h-[140px] lg:h-[160px]">
        <OptimizedImage
          src={bannerUrl}
          alt={`${name} cover`}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
      </div>
    )}
    <div className="mx-auto max-w-[1280px] px-6 py-12 md:px-16 md:py-16">
      <div className="max-w-[820px]">
        <Eyebrow>{city ? `${city} · ` : ''}@{slug}</Eyebrow>
        <h1
          className={cn(
            typography.h2,
            'mt-4 leading-[1.05] tracking-[-0.02em] text-[var(--text-primary)]',
          )}
        >
          {name}
        </h1>
        {bio && (
          <div className="mt-6 max-w-[58ch]">
            <HeroBio
              bio={bio}
              name={name}
              threshold={200}
              clampLines={3}
              className="text-[18px] leading-[1.55]"
            />
          </div>
        )}
        <HeroStatsLine
          className="mt-6"
          productsCount={productsCount}
          totalOrders={totalOrders}
          totalEarned={totalEarned}
        />
        <div className="mt-8 flex flex-wrap items-center gap-3">
          {tipEnabled && (
            <button
              type="button"
              onClick={onTipClick}
              className="inline-flex h-10 items-center rounded-md border border-[var(--border-strong)] bg-[var(--background)] px-4 font-sans text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-sunken)]"
            >
              Tip
            </button>
          )}
        </div>
      </div>
    </div>
  </header>
)

const StudioRow: React.FC<{
  product: schemas['Product']
  index: number
}> = ({ product, index }) => (
  <Link
    href={`/product/${product.id}`}
    className="group flex items-baseline gap-6 border-b border-[var(--border)] py-6 transition-colors hover:bg-[var(--surface-sunken)]"
  >
    <span className="w-10 flex-shrink-0 font-sans text-[13px] font-semibold tabular-nums text-[var(--text-muted)]">
      {String(index + 1).padStart(2, '0')}
    </span>
    <div className="flex flex-1 flex-col gap-1 min-w-0 pr-4">
      <h3 className="font-display text-[20px] font-semibold leading-[1.25] tracking-[-0.01em] text-[var(--text-primary)] group-hover:text-[var(--accent)]">
        {product.name}
      </h3>
      {product.description && (
        <p className="line-clamp-2 max-w-[64ch] font-sans text-[14px] leading-[1.55] text-[var(--text-secondary)]">
          {product.description}
        </p>
      )}
    </div>
  </Link>
)

const StudioWorkSection: React.FC<StorefrontWorkSectionProps> = ({
  products,
  creatorName,
}) => {
  if (!products.length) {
    return (
      <section className="mx-auto max-w-[1280px] px-6 py-16 md:px-16 md:py-24">
        <div className="max-w-[820px]">
          <h2 className={cn(typography.h3, 'text-[var(--text-primary)]')}>
            {creatorName} hasn&rsquo;t published anything yet.
          </h2>
        </div>
      </section>
    )
  }
  return (
    <section className="mx-auto max-w-[1280px] px-6 py-10 md:px-16 md:py-16">
      {/* Eyebrow stays in the narrow text column for editorial reading
          rhythm; the index list itself spans the full container so
          long product names + descriptions have room on wide
          monitors. */}
      <div className="max-w-[820px]">
        <Eyebrow className="mb-2">Index</Eyebrow>
      </div>
      <div className="border-t border-[var(--border)]">
        {products.map((product, i) => (
          <StudioRow key={product.id} product={product} index={i} />
        ))}
      </div>
    </section>
  )
}

export const StudioLayout: StorefrontLayout = {
  slug: 'studio',
  Hero: StudioHero,
  WorkSection: StudioWorkSection,
}
