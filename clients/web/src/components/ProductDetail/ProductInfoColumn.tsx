'use client'

import Link from 'next/link'
import { FiHeart, FiShare2 } from 'react-icons/fi'
import { schemas } from '@/lib/api'
import { OptimizedImage } from '@/components/Image/OptimizedImage'
import { typography } from '@/design'
import { cn } from '@/lib/utils'
import { useDisplayCurrency } from '@/components/Marketplace/CurrencyProvider'
import { findPriceForCurrency } from '@/lib/currency/marketplace'

type Product = schemas['Product']

export interface ProductInfoColumnProps {
  product: Product
  onBuy: () => void
  onWishlistToggle: () => void
  onShare: () => void
  isInWishlist?: boolean
  isBuyLoading?: boolean
  onTip?: () => void
}

const formatPrice = (product: Product, preferredCurrency?: string): string => {
  // Prefer the visitor-currency price (the PDP 404s server-side if absent),
  // falling back to the first price defensively. We never convert.
  const price =
    (preferredCurrency
      ? (findPriceForCurrency(product, preferredCurrency) as any)
      : null) ?? product.prices?.[0]
  if (!price) return 'Free'
  const amount = (price as any).price_amount ?? 0
  if (amount === 0) return 'Free'
  const currency = ((price as any).price_currency ?? 'KES').toUpperCase()
  const major = amount / 100
  if (currency === 'KES') return `KSh ${major.toLocaleString('en-KE')}`
  if (currency === 'USD') return `US$ ${major.toLocaleString('en-US')}`
  return `${currency} ${major.toLocaleString()}`
}

const getBuyLabel = (product: Product, preferredCurrency?: string): string => {
  const price =
    (preferredCurrency
      ? (findPriceForCurrency(product, preferredCurrency) as any)
      : null) ?? product.prices?.[0]
  const amount = (price as any)?.price_amount ?? 0
  if (amount === 0) return 'Get it free'
  if (product.is_recurring) {
    const interval = product.recurring_interval ?? 'month'
    return `Subscribe · ${formatPrice(product, preferredCurrency)} / ${interval}`
  }
  return `Buy · ${formatPrice(product, preferredCurrency)}`
}

/**
 * ProductInfoColumn — the editorial buy-box.
 *
 * Visual hierarchy: eyebrow → title → price → lede → CTA → secondary.
 * Generous spacing (8px base, gap-8 between groups). Typography from the
 * design scale. tabular-nums on prices. No shadows, no gradients.
 */
export const ProductInfoColumn = ({
  product,
  onBuy,
  onWishlistToggle,
  onShare,
  isInWishlist = false,
  isBuyLoading = false,
  onTip,
}: ProductInfoColumnProps) => {
  const displayCurrency = useDisplayCurrency()
  const org = (product as any).organization as
    | { name?: string; slug?: string; avatar_url?: string | null }
    | undefined
  const lede = product.description?.split('\n')[0]?.slice(0, 220) ?? null
  const acceptsDonations = (product as any).accepts_donations === true
  const showTip = acceptsDonations && !!org?.slug && !!onTip

  return (
    <div className="flex flex-col gap-8">
      {/* Creator eyebrow */}
      {org?.name && (
        <Link
          href={`/creators/${org.slug ?? ''}`}
          prefetch
          className="group inline-flex w-fit items-center gap-3"
        >
          {org.avatar_url && (
            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[var(--surface-sunken)] ring-1 ring-[var(--border)]">
              <OptimizedImage
                src={org.avatar_url}
                alt={`${org.name} avatar`}
                fill
                sizes="32px"
              />
            </div>
          )}
          <span className={cn(typography.eyebrow, 'transition-colors group-hover:text-[var(--accent)]')}>
            {org.name}
          </span>
        </Link>
      )}

      {/* Title */}
      <h1
        className={cn(
          'font-display font-semibold tracking-[-0.02em] leading-[1.08]',
          'text-[clamp(28px,4vw,44px)] text-[var(--text-primary)]',
        )}
      >
        {product.name}
      </h1>

      {/* Price */}
      <p className="font-display text-[clamp(24px,3vw,32px)] font-semibold leading-none text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
        {formatPrice(product, displayCurrency)}
        {product.is_recurring && (
          <span className="ml-2 font-sans text-[14px] font-normal text-[var(--text-muted)]">
            / {product.recurring_interval ?? 'month'}
          </span>
        )}
      </p>

      {/* Lede */}
      {lede && (
        <p className={cn(typography.body, 'max-w-[56ch] text-[var(--text-secondary)]')}>
          {lede}
        </p>
      )}

      {/* Buy CTA — full-width, generous padding */}
      <div className="flex flex-col gap-3 pt-2">
        <button
          type="button"
          onClick={onBuy}
          disabled={isBuyLoading || product.is_archived}
          aria-busy={isBuyLoading}
          className={cn(
            'inline-flex h-[56px] w-full items-center justify-center rounded-lg',
            'bg-[var(--accent)] px-7 font-sans text-[15px] font-medium text-[var(--accent-foreground)]',
            'transition-colors duration-200 hover:bg-[var(--accent-hover)]',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          {isBuyLoading ? 'Adding…' : getBuyLabel(product, displayCurrency)}
        </button>

        {/* Payment note */}
        <p className="flex items-center gap-2 font-sans text-[13px] text-[var(--text-muted)]">
          <span className="h-1 w-1 rounded-full bg-[var(--accent)]" aria-hidden="true" />
          Card or M-Pesa · Instant delivery
        </p>
      </div>

      {/* Secondary: Wishlist + Share */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onWishlistToggle}
          aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={isInWishlist}
          className={cn(
            'inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg',
            'border border-[var(--border-strong)] bg-transparent',
            'font-sans text-[14px] font-medium text-[var(--text-primary)]',
            'transition-colors duration-200 hover:bg-[var(--surface-sunken)]',
          )}
        >
          <FiHeart
            size={16}
            className={cn(
              isInWishlist
                ? 'fill-[var(--accent)] text-[var(--accent)]'
                : 'text-[var(--text-secondary)]',
            )}
          />
          {isInWishlist ? 'Saved' : 'Wishlist'}
        </button>
        <button
          type="button"
          onClick={onShare}
          aria-label="Share product"
          className={cn(
            'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg',
            'border border-[var(--border-strong)] bg-transparent',
            'text-[var(--text-secondary)] transition-colors duration-200',
            'hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]',
          )}
        >
          <FiShare2 size={16} />
        </button>
      </div>

      {/* Tip the creator */}
      {showTip && (
        <button
          type="button"
          onClick={onTip}
          data-testid="product-tip-creator"
          className={cn(
            'inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg',
            'border border-[var(--border-strong)] bg-transparent',
            'font-sans text-[14px] font-medium text-[var(--text-primary)]',
            'transition-colors duration-200 hover:bg-[var(--surface-sunken)]',
          )}
        >
          <FiHeart size={16} className="text-[var(--accent)]" />
          Tip the creator
        </button>
      )}
    </div>
  )
}
