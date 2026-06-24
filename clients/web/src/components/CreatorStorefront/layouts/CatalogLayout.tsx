'use client'

/**
 * CatalogLayout — many-SKU sellers (ebooks, presets, beats). Per
 * plan §19.4.
 *
 * Differences from editorial:
 *   - Compact identity strip (no banner). Takes less vertical space
 *     so 30+ products fit in a buyer's first scroll.
 *   - List-row product display (thumb + title + price on one line)
 *     instead of a card grid. Optimised for scanning, not browsing.
 *   - Type-led, no large imagery in the hero.
 */

import Link from 'next/link'

import Avatar from '@/components/atoms/Avatar'
import { OptimizedImage } from '@/components/Image/OptimizedImage'
import { Eyebrow, typography } from '@/design'
import { useDisplayCurrency } from '@/components/Marketplace/CurrencyProvider'
import { formatProductPrice } from '@/lib/currency/marketplace'
import { schemas } from '@/lib/api'
import { cn } from '@/lib/utils'

import type {
  StorefrontHeroProps,
  StorefrontLayout,
  StorefrontWorkSectionProps,
} from './index'
import { HeroBio, HeroStatsLine } from './_shared'

const CatalogHero: React.FC<StorefrontHeroProps> = ({
  name,
  slug,
  bio,
  avatarUrl,
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
  <header className="border-b border-[var(--border)] bg-[var(--surface)]">
    {/* Banner — thin (5:1 aspect) so the catalog rows below
        stay above the fold on most viewports. */}
    {bannerUrl && (
      <div className="relative h-[120px] w-full overflow-hidden bg-[var(--surface-sunken)] sm:h-[140px] md:h-[160px] lg:h-[180px]">
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
    <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between md:px-16">
      <div className="flex items-center gap-3">
        <Avatar avatar_url={avatarUrl ?? null} name={name} className="h-12 w-12" />
        <div className="flex flex-col">
          <h1 className="font-display text-[20px] font-semibold leading-[1.1] tracking-[-0.01em] text-[var(--text-primary)]">
            {name}
          </h1>
          <span className="font-sans text-[12px] text-[var(--text-muted)]">
            @{slug}{city ? ` · ${city}` : ''}
          </span>
          <HeroStatsLine
            className="mt-1"
            productsCount={productsCount}
            totalOrders={totalOrders}
            totalEarned={totalEarned}
          />
        </div>
      </div>
      <HeroBio
        bio={bio}
        name={name}
        threshold={120}
        clampLines={2}
        className="max-w-[44ch] text-[13px]"
      />
      <div className="flex flex-shrink-0 items-center gap-2">
        {tipEnabled && (
          <button
            type="button"
            onClick={onTipClick}
            className="inline-flex h-9 items-center rounded-md border border-[var(--border-strong)] bg-[var(--background)] px-3 font-sans text-[12px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-sunken)]"
          >
            Tip
          </button>
        )}
      </div>
    </div>
  </header>
)

const CatalogRow: React.FC<{ product: schemas['Product'] }> = ({ product }) => {
  const displayCurrency = useDisplayCurrency()
  const cover = product.medias?.[0]?.public_url ?? null
  const price = formatProductPrice(product, displayCurrency)

  return (
    <Link
      href={`/product/${product.id}`}
      className="group flex items-center gap-4 border-b border-[var(--border)] px-2 py-4 transition-colors hover:bg-[var(--surface-sunken)]"
    >
      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-sm bg-[var(--surface-sunken)]">
        {cover ? (
          <OptimizedImage
            src={cover}
            alt={product.name}
            fill
            className="object-cover"
            sizes="64px"
          />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 min-w-0">
        <h3 className="truncate font-display text-[15px] font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)]">
          {product.name}
        </h3>
        {product.description && (
          <p className="line-clamp-1 font-sans text-[12px] text-[var(--text-muted)]">
            {product.description}
          </p>
        )}
      </div>
      {price && (
        <span className="flex-shrink-0 font-sans text-[14px] font-medium tabular-nums text-[var(--text-primary)]">
          {price}
        </span>
      )}
    </Link>
  )
}

const CatalogWorkSection: React.FC<StorefrontWorkSectionProps> = ({
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
    <section className="mx-auto max-w-[1280px] px-6 py-8 md:px-16 md:py-12">
      <div className="border-t border-[var(--border)]">
        {products.map((product) => (
          <CatalogRow key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}

export const CatalogLayout: StorefrontLayout = {
  slug: 'catalog',
  Hero: CatalogHero,
  WorkSection: CatalogWorkSection,
}
