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

const CatalogHero: React.FC<StorefrontHeroProps> = ({
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
  <header className="border-b border-[var(--border)] bg-[var(--surface)]">
    <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between md:px-12">
      <div className="flex items-center gap-3">
        <Avatar avatar_url={avatarUrl ?? null} name={name} className="h-12 w-12" />
        <div className="flex flex-col">
          <h1 className="font-display text-[20px] font-semibold leading-[1.1] tracking-[-0.01em] text-[var(--text-primary)]">
            {name}
          </h1>
          <span className="font-sans text-[12px] text-[var(--text-muted)]">
            @{slug} · {city ?? 'Nairobi'}
          </span>
        </div>
      </div>
      {bio && (
        <p className="max-w-[44ch] font-sans text-[13px] leading-[1.5] text-[var(--text-secondary)]">
          {bio}
        </p>
      )}
      <div className="flex flex-shrink-0 items-center gap-2">
        {hasSubscriptions && (
          <button
            type="button"
            onClick={onSubscribeClick}
            className="inline-flex h-9 items-center rounded-md bg-[var(--accent)] px-3 font-sans text-[12px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            Subscribe
          </button>
        )}
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
      href={`/products/${product.id}`}
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
      <section className="mx-auto max-w-[1024px] px-6 py-16 md:px-12 md:py-24">
        <h2 className={cn(typography.h3, 'text-[var(--text-primary)]')}>
          {creatorName} hasn&rsquo;t published anything yet.
        </h2>
      </section>
    )
  }
  return (
    <section className="mx-auto max-w-[1024px] px-2 py-8 md:px-12 md:py-12">
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
