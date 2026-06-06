'use client'

import Link from 'next/link'
import { useReducedMotion, motion } from 'motion/react'
import { FiStar } from 'react-icons/fi'
import { schemas } from '@/lib/api'
import { OptimizedImage } from '@/components/Image/OptimizedImage'
import { typography } from '@/design'
import { cn } from '@/lib/utils'
import { useDisplayCurrency } from './CurrencyProvider'
import { CardWishlistButton } from './CardWishlistButton'

type Product = schemas['Product']

interface MarketplaceProductCardProps {
  product: Product
  /** Override the link target — defaults to /product/[id] */
  href?: string
  /** Hide the creator line (used on creator storefront pages) */
  hideCreator?: boolean
  className?: string
}

const formatPrice = (product: Product, preferredCurrency?: string): string => {
  // Pick the price in the visitor's currency when the creator set one;
  // otherwise fall back to the first price. We never convert — the grid is
  // already filtered to products priced in the visitor's currency.
  const prices = (product.prices ?? []) as any[]
  if (prices.length === 0) return ''
  const preferred = preferredCurrency?.toLowerCase()
  const price =
    (preferred &&
      prices.find(
        (p) => (p?.price_currency ?? '').toLowerCase() === preferred,
      )) ||
    prices[0]
  // price.price_amount is in minor units (e.g. KES cents = 1/100 of KES)
  const amount = (price as any).price_amount ?? 0
  const currency = ((price as any).price_currency ?? 'KES').toUpperCase()
  const major = amount / 100
  // Use UNAMBIGUOUS currency labels so an international visitor isn't left
  // guessing what "$" or a bare number means. KES keeps the local "KSh"
  // convention; USD shows "US$"; everything else prefixes the ISO code.
  if (currency === 'KES') return `KSh ${major.toLocaleString('en-KE')}`
  if (currency === 'USD') return `US$ ${major.toLocaleString('en-US')}`
  return `${currency} ${major.toLocaleString()}`
}

/**
 * Tonal placeholder palette for cards without uploaded media. Stays inside the
 * Blyss palette tokens — variations come from background tone + accent tint.
 * Picked deterministically from product id so the home grid doesn't render
 * eight identical tiles. (Spec §3.4: real photography or editorial placeholder.)
 */
const PLACEHOLDER_TONES = [
  { bg: 'bg-[var(--surface-sunken)]', mark: 'text-[var(--text-muted)]' },
  { bg: 'bg-[var(--surface)]', mark: 'text-[var(--text-secondary)]' },
  { bg: 'bg-[var(--surface-elevated)]', mark: 'text-[var(--text-secondary)]' },
  { bg: 'bg-[var(--accent)]', mark: 'text-[var(--accent-foreground)]' },
] as const

const pickTone = (key: string) => {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return PLACEHOLDER_TONES[h % PLACEHOLDER_TONES.length]
}

/**
 * MarketplaceProductCard — the canonical product card for the marketplace
 * surface. Used in trending grids, featured sections, related products, etc.
 *
 * Per plan §3.4 + §6.1 trending products section:
 * - 4:5 aspect ratio image (editorial-tall)
 * - No drop-shadow, no border — sits on background tone
 * - Hover: image scales 1.04, accent underline appears under product name
 * - No "Add to cart" button on the card itself (decision happens on PDP)
 * - Tabular numerals on price
 */
export const MarketplaceProductCard = ({
  product,
  href,
  hideCreator,
  className,
}: MarketplaceProductCardProps) => {
  const reduce = useReducedMotion()
  const displayCurrency = useDisplayCurrency()
  const productImage = product.medias?.[0]?.public_url
  // Seed-data placeholders use ids prefixed "seed_" — they have no PDP, so
  // route the click to the marketplace browse page instead of 404'ing.
  const isSeed = typeof product.id === 'string' && product.id.startsWith('seed_')
  const linkHref = href ?? (isSeed ? '/marketplace' : `/product/${product.id}`)
  const creatorName =
    (product as any).organization?.name ??
    (product as any).organization?.slug ??
    null

  return (
    <Link
      href={linkHref}
      prefetch
      aria-label={`${product.name}${creatorName ? ` by ${creatorName}` : ''}`}
      className={cn('group block', className)}
    >
      {/* Image — 4:5 aspect, hover scale; typographic placeholder when no media */}
      <div className="relative w-full overflow-hidden rounded-md bg-[var(--surface-sunken)]">
        {/* Etsy-style quick-save: small heart at top-right, hover-revealed on
            desktop, always visible on mobile. Skipped on seed products
            (id starts with "seed_") which have no real PDP. */}
        {!isSeed && (
          <CardWishlistButton productId={product.id} />
        )}
        <motion.div
          initial={false}
          whileHover={reduce ? undefined : { scale: 1.04 }}
          transition={{
            duration: reduce ? 0 : 0.5,
            ease: [0.32, 0.72, 0, 1],
          }}
        >
          {productImage ? (
            <OptimizedImage
              src={productImage}
              alt={`${product.name} — Product cover`}
              fill
              aspectRatio="4/5"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="rounded-md"
            />
          ) : (
            (() => {
              const tone = pickTone(product.id)
              return (
                <div
                  aria-hidden
                  className={cn(
                    'relative flex aspect-[4/5] w-full flex-col justify-between rounded-md p-5 md:p-6',
                    tone.bg,
                  )}
                >
                  <span
                    className={cn(
                      'font-display text-[40px] font-light leading-none md:text-[56px]',
                      tone.mark,
                    )}
                  >
                    {(creatorName?.[0] ?? product.name[0] ?? '·').toUpperCase()}
                  </span>
                  <p
                    className={cn(
                      'font-display text-[15px] font-medium leading-tight md:text-[16px]',
                      tone.mark,
                    )}
                  >
                    {product.name}
                  </p>
                </div>
              )
            })()
          )}
        </motion.div>
      </div>

      {/* Product info */}
      <div className="mt-4 flex flex-col gap-1">
        <h3
          className={cn(
            typography.h4,
            'line-clamp-2 text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)]',
          )}
        >
          {product.name}
        </h3>
        {!hideCreator && creatorName && (
          <p className={cn(typography.small, 'text-[var(--text-muted)]')}>
            by {creatorName}
          </p>
        )}
        {(() => {
          // Compact rating per blyss-design (no 5-star graphic row): show
          // "4.8 · 32 reviews" only when the product has reviews.
          const summary = (product as any).review_summary as
            | { average_rating: number; total_reviews: number }
            | null
            | undefined
          if (!summary || summary.total_reviews <= 0) return null
          return (
            <p className="flex items-center gap-1.5 font-sans text-[13px] text-[var(--text-secondary)]">
              <FiStar
                size={13}
                className="fill-[var(--accent)] text-[var(--accent)]"
              />
              <span className="font-medium tabular-nums">
                {summary.average_rating.toFixed(1)}
              </span>
              <span className="text-[var(--text-muted)]">
                · {summary.total_reviews}{' '}
                {summary.total_reviews === 1 ? 'review' : 'reviews'}
              </span>
            </p>
          )
        })()}
        <p
          className={cn(
            'mt-1 font-display text-[18px] font-semibold tabular-nums text-[var(--text-primary)]',
          )}
        >
          {formatPrice(product, displayCurrency)}
        </p>
      </div>
    </Link>
  )
}
