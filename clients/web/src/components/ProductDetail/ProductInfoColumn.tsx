'use client'

import Link from 'next/link'
import { FiHeart, FiShare2 } from 'react-icons/fi'
import { schemas } from '@/lib/api'
import { OptimizedImage } from '@/components/Image/OptimizedImage'
import { typography } from '@/design'
import { cn } from '@/lib/utils'

type Product = schemas['Product']

export interface ProductInfoColumnProps {
  product: Product
  /** Callback when "Buy" / "Add to cart" is clicked */
  onBuy: () => void
  /** Callback for wishlist toggle */
  onWishlistToggle: () => void
  /** Callback for share button */
  onShare: () => void
  /** Whether the product is already in the user's wishlist */
  isInWishlist?: boolean
  /** Buy button loading state */
  isBuyLoading?: boolean
}

const formatPrice = (product: Product): string => {
  const price = product.prices?.[0]
  if (!price) return 'Free'
  const amount = (price as any).price_amount ?? 0
  if (amount === 0) return 'Free'
  const currency = ((price as any).price_currency ?? 'KES').toUpperCase()
  const major = amount / 100
  if (currency === 'KES') return `KSh ${major.toLocaleString('en-KE')}`
  if (currency === 'USD') return `$${major.toLocaleString('en-US')}`
  return `${major.toLocaleString()} ${currency}`
}

const getBuyLabel = (product: Product): string => {
  const price = product.prices?.[0]
  const amount = (price as any)?.price_amount ?? 0
  if (amount === 0) return 'Get it'
  if (product.is_recurring) {
    const interval = product.recurring_interval ?? 'month'
    return `Subscribe — ${formatPrice(product)} / ${interval}`
  }
  return `Buy for ${formatPrice(product)}`
}

/**
 * ProductInfoColumn — the right column of the PDP per plan §6.5 step 3.
 *
 * Eyebrow: creator name + small avatar (link to /creators/[slug])
 * Title: Inter Display 500 36-48px clamp
 * Price: large tabular nums
 * Lede: 1-2 sentences (product description first paragraph)
 * Buy CTA: full-width accent filled, text varies by type
 * Secondary: Wishlist (heart ghost) + Share (icon ghost)
 */
export const ProductInfoColumn = ({
  product,
  onBuy,
  onWishlistToggle,
  onShare,
  isInWishlist = false,
  isBuyLoading = false,
}: ProductInfoColumnProps) => {
  const org = (product as any).organization as
    | { name?: string; slug?: string; avatar_url?: string | null }
    | undefined
  const lede = product.description?.split('\n')[0]?.slice(0, 200) ?? null

  return (
    <div className="flex flex-col gap-6">
      {/* Creator eyebrow */}
      {org?.name && (
        <Link
          href={`/creators/${org.slug ?? ''}`}
          prefetch
          className="group inline-flex items-center gap-2.5"
        >
          {org.avatar_url && (
            <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
              <OptimizedImage
                src={org.avatar_url}
                alt={`${org.name} avatar`}
                fill
                sizes="28px"
              />
            </div>
          )}
          <span className="font-sans text-[13px] font-medium text-[var(--text-secondary)] transition-colors group-hover:text-[var(--accent)]">
            {org.name}
          </span>
        </Link>
      )}

      {/* Title */}
      <h1
        className={cn(
          'font-display font-medium tracking-[-0.015em] leading-[1.15]',
          'text-[clamp(28px,3.5vw,48px)] text-[var(--text-primary)]',
        )}
      >
        {product.name}
      </h1>

      {/* Price */}
      <p className="font-display text-[28px] font-semibold tabular-nums text-[var(--text-primary)]">
        {formatPrice(product)}
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

      {/* Buy CTA */}
      <button
        type="button"
        onClick={onBuy}
        disabled={isBuyLoading || product.is_archived}
        aria-busy={isBuyLoading}
        className={cn(
          'mt-2 inline-flex h-14 w-full items-center justify-center rounded-md bg-[var(--accent)] px-7 font-sans text-[15px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        {isBuyLoading ? 'Adding…' : getBuyLabel(product)}
      </button>

      {/* M-Pesa-first payment note (factual, not a badge strip) */}
      <p className="-mt-2 flex items-center gap-2 font-sans text-[13px] text-[var(--text-muted)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
        Pay with M-Pesa or card · instant download
      </p>

      {/* Secondary actions — Wishlist + Share */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onWishlistToggle}
          aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={isInWishlist}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-[var(--border-strong)] bg-transparent font-sans text-[14px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-sunken)]"
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
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[var(--border-strong)] bg-transparent text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]"
        >
          <FiShare2 size={16} />
        </button>
      </div>
    </div>
  )
}
