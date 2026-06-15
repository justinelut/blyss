'use client'

import Link from 'next/link'
import { FiHeart, FiShare2, FiStar } from 'react-icons/fi'
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
  /** When true, the signed-in user already has an active subscription to
   *  this product. Replaces the Subscribe CTA with a "Manage in portal"
   *  link instead of letting the buyer crash into
   *  AlreadyActiveSubscriptionError at confirm time. */
  hasActiveSubscription?: boolean
  /** Deep-link to the customer portal when the user is already subscribed. */
  portalUrl?: string | null
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
  hasActiveSubscription = false,
  portalUrl,
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
      {/* Sold-by block — Etsy-style 'From shop {creator}' so the buyer
          knows up-front who they're paying. Click → creator storefront. */}
      {org?.name && (
        <Link
          href={`/creators/${org.slug ?? ''}`}
          prefetch
          className="group inline-flex w-fit items-center gap-3"
        >
          {org.avatar_url && (
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[var(--surface-sunken)] ring-1 ring-[var(--border)]">
              <OptimizedImage
                src={org.avatar_url}
                alt={`${org.name} avatar`}
                fill
                sizes="40px"
              />
            </div>
          )}
          <div className="min-w-0 flex flex-col">
            <span className="font-sans text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              Sold by
            </span>
            <span className="truncate font-display text-[15px] font-medium text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)]">
              {org.name}
            </span>
          </div>
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

      {/* Compact review summary — buyer-conversion signal in the buy box.
          Only rendered when the product has at least one review. Per
          blyss-design: numerals + single accent star, never a 5-star row. */}
      {(() => {
        const summary = (product as any).review_summary as
          | { average_rating: number; total_reviews: number }
          | null
          | undefined
        if (!summary || summary.total_reviews <= 0) return null
        return (
          <p className="flex items-center gap-1.5 font-sans text-[14px] text-[var(--text-secondary)]">
            <FiStar
              size={14}
              className="fill-[var(--accent)] text-[var(--accent)]"
              aria-hidden="true"
            />
            <span className="font-medium tabular-nums text-[var(--text-primary)]">
              {summary.average_rating.toFixed(1)}
            </span>
            <span className="text-[var(--text-muted)]">
              ·{' '}
              <a
                href="#reviews"
                className="underline-offset-4 transition-colors hover:text-[var(--accent)] hover:underline"
              >
                {summary.total_reviews}{' '}
                {summary.total_reviews === 1 ? 'review' : 'reviews'}
              </a>
            </span>
          </p>
        )
      })()}

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

      {/* Buy CTA — full-width, generous padding. Suppressed when the buyer
          already has an active subscription to a recurring product (we hide
          the orange Subscribe button and surface a 'Manage in portal' link
          instead, so they don't click through and crash into
          AlreadyActiveSubscriptionError at confirm time). */}
      <div className="flex flex-col gap-3 pt-2">
        {hasActiveSubscription ? (
          <div className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] p-5">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
              You're subscribed
            </p>
            <p className="max-w-[44ch] font-sans text-[14px] leading-[1.55] text-[var(--text-secondary)]">
              You already have an active subscription to {product.name}. Manage
              it — or cancel — from your portal.
            </p>
            {portalUrl && (
              <Link
                href={portalUrl}
                className={cn(
                  'mt-1 inline-flex h-[48px] items-center justify-center self-start rounded-lg',
                  'border border-[var(--border-strong)] bg-transparent px-6',
                  'font-sans text-[14px] font-medium text-[var(--text-primary)]',
                  'transition-colors hover:bg-[var(--surface)]',
                )}
              >
                Manage in portal
              </Link>
            )}
          </div>
        ) : (
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
        )}

        {/* Payment note — kept generic so the line reads
            internationally. Specific methods are surfaced at
            checkout based on the visitor's country. */}
        <p className="flex items-center gap-2 font-sans text-[13px] text-[var(--text-muted)]">
          <span className="h-1 w-1 rounded-full bg-[var(--accent)]" aria-hidden="true" />
          Secure checkout · Instant delivery
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
