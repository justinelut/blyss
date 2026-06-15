'use client'

/**
 * GalleryLayout — image-first storefront for photographers,
 * illustrators, fashion designers. Per plan §19.4.
 *
 * Differences from editorial:
 *   - Compact identity row (avatar + name + bio + CTAs in a single
 *     horizontal band instead of a full-bleed 16:9 banner). Photo
 *     reels are the focus, not the creator's portrait.
 *   - 2-column product grid on desktop (was 4). Each product is
 *     larger so the imagery dominates. Mobile stays 1-column.
 *   - Tighter type rhythm — the creator's identity gets out of the
 *     way fast.
 */

import Link from 'next/link'

import Avatar from '@/components/atoms/Avatar'
import { MarketplaceProductCard } from '@/components/Marketplace/MarketplaceProductCard'
import { Eyebrow, typography } from '@/design'
import { schemas } from '@/lib/api'
import { cn } from '@/lib/utils'

import type {
  StorefrontHeroProps,
  StorefrontLayout,
  StorefrontWorkSectionProps,
} from './index'

const GalleryHero: React.FC<StorefrontHeroProps> = ({
  name,
  slug,
  bio,
  avatarUrl,
  city,
  hasSubscriptions,
  tipEnabled,
  onSubscribeClick,
  onTipClick,
}) => (
  <header className="border-b border-[var(--border)] bg-[var(--background)]">
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between md:px-16 md:py-14">
      <div className="flex items-center gap-4">
        <Avatar avatar_url={avatarUrl ?? null} name={name} className="h-16 w-16" />
        <div className="flex flex-col gap-1">
          {city && <Eyebrow>{city}</Eyebrow>}
          <h1
            className={cn(
              'font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--text-primary)] md:text-[34px]',
            )}
          >
            {name}
          </h1>
          {bio && (
            <p className="max-w-[60ch] font-sans text-[14px] leading-[1.55] text-[var(--text-secondary)]">
              {bio}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-3">
        {hasSubscriptions && (
          <button
            type="button"
            onClick={onSubscribeClick}
            className="inline-flex h-10 items-center rounded-md bg-[var(--accent)] px-4 font-sans text-[13px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            Subscribe
          </button>
        )}
        {tipEnabled && (
          <button
            type="button"
            onClick={onTipClick}
            className="inline-flex h-10 items-center rounded-md border border-[var(--border-strong)] bg-[var(--background)] px-4 font-sans text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-sunken)]"
          >
            Tip
          </button>
        )}
        <Link
          href={`/creators/${slug}`}
          className="font-sans text-[13px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          @{slug}
        </Link>
      </div>
    </div>
  </header>
)

const GalleryWorkSection: React.FC<StorefrontWorkSectionProps> = ({
  products,
  creatorName,
}) => {
  if (!products.length) {
    return (
      <section className="mx-auto max-w-[1280px] px-6 py-16 md:px-16 md:py-24">
        <h2 className={cn(typography.h3, 'text-[var(--text-primary)]')}>
          {creatorName} hasn&rsquo;t published anything yet.
        </h2>
      </section>
    )
  }
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-10 md:px-12 md:py-16">
      <div className="grid grid-cols-1 gap-x-4 gap-y-12 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-16">
        {products.map((product) => (
          <MarketplaceProductCard
            key={product.id}
            product={product}
            hideCreator
          />
        ))}
      </div>
    </section>
  )
}

export const GalleryLayout: StorefrontLayout = {
  slug: 'gallery',
  Hero: GalleryHero,
  WorkSection: GalleryWorkSection,
}
