'use client'

/**
 * PortfolioLayout — designers, agencies, freelancers selling
 * templates. Per plan §19.4.
 *
 * Differences from editorial:
 *   - Resume-style banner with "Selected work" framing instead of a
 *     single hero image. Wider availability strip below name.
 *   - Product grid is 3-col with case-study-style cards (the
 *     existing MarketplaceProductCard works fine — we just frame
 *     it under a "Selected work" eyebrow).
 *   - The hero positions products as evidence of the creator's
 *     practice, not as a shop-front.
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

const PortfolioHero: React.FC<StorefrontHeroProps> = ({
  name,
  slug,
  bio,
  avatarUrl,
  city,
  hasSubscriptions,
  tipEnabled,
  socials,
  onSubscribeClick,
  onTipClick,
}) => (
  <header className="border-b border-[var(--border)] bg-[var(--background)]">
    <div className="mx-auto max-w-[1280px] px-6 py-12 md:px-16 md:py-20">
      <Eyebrow>{city ?? 'Nairobi'} · Selected work</Eyebrow>
      <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="flex items-end gap-5">
          <Avatar avatar_url={avatarUrl ?? null} name={name} className="h-20 w-20" />
          <div className="flex flex-col gap-2">
            <h1
              className={cn(
                typography.h1,
                'leading-[1.0] tracking-[-0.025em] text-[var(--text-primary)]',
              )}
            >
              {name}
            </h1>
            <span className="font-sans text-[14px] text-[var(--text-muted)]">
              @{slug}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
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
        </div>
      </div>
      {bio && (
        <p className="mt-8 max-w-[64ch] font-sans text-[20px] leading-[1.45] text-[var(--text-secondary)]">
          {bio}
        </p>
      )}
      {socials && (socials.twitter || socials.instagram || socials.website) && (
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 font-sans text-[13px] text-[var(--text-muted)]">
          {socials.website && (
            <Link
              href={socials.website}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--text-primary)]"
            >
              Website
            </Link>
          )}
          {socials.twitter && (
            <Link
              href={`https://twitter.com/${socials.twitter}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--text-primary)]"
            >
              Twitter / X
            </Link>
          )}
          {socials.instagram && (
            <Link
              href={`https://instagram.com/${socials.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--text-primary)]"
            >
              Instagram
            </Link>
          )}
        </div>
      )}
    </div>
  </header>
)

const PortfolioWorkSection: React.FC<StorefrontWorkSectionProps> = ({
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
    <section className="mx-auto max-w-[1280px] px-6 py-12 md:px-16 md:py-20">
      <Eyebrow className="mb-8">Work</Eyebrow>
      <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
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

export const PortfolioLayout: StorefrontLayout = {
  slug: 'portfolio',
  Hero: PortfolioHero,
  WorkSection: PortfolioWorkSection,
}
