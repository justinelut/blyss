'use client'

import Link from 'next/link'
import { FiHeart, FiTrash2 } from 'react-icons/fi'
import { OptimizedImage } from '@/components/Image/OptimizedImage'
import { schemas } from '@/lib/api'
import { cn } from '@/lib/utils'

interface CartItemRowProps {
  item: {
    id: string
    product: schemas['Product']
    quantity: number
    subtotal: number
    /** Lowercase ISO currency the row was priced in (server-resolved
     *  against the visitor's geo currency). May be missing on older
     *  cached responses — we fall back to product.prices[0] in that
     *  case to avoid a render crash. */
    currency?: string | null
  }
  onRemove: (itemId: string) => void
  isRemoving?: boolean
  /** Optional Etsy-style "Save for later" — moves the item to wishlist + removes
   *  it from the cart. When undefined, the affordance is hidden. */
  onSaveForLater?: (item: CartItemRowProps['item']) => void
  isSaving?: boolean
}

const fmtPrice = (cents: number, currency = 'KES') => {
  const major = cents / 100
  // Unambiguous currency labels: KES → "KSh", USD → "US$" (not bare "$"),
  // others ISO-prefixed. Matches the rest of the marketplace polish gate.
  if (currency === 'KES') return `KSh ${major.toLocaleString('en-KE')}`
  if (currency === 'USD') return `US$ ${major.toLocaleString('en-US')}`
  return `${currency} ${major.toLocaleString()}`
}

/**
 * CartItemRow — thumbnail + name + creator + price + secondary actions.
 *
 * Per plan §6.6 + Etsy-style buyer affordances. Used in both the drawer
 * and the full cart page.
 */
export const CartItemRow = ({
  item,
  onRemove,
  isRemoving,
  onSaveForLater,
  isSaving,
}: CartItemRowProps) => {
  const { product } = item
  const img = product.medias?.[0]?.public_url
  const org = (product as any).organization
  // Server tells us which currency the row was actually priced in
  // (resolved against the visitor's geo currency). Fall back to the
  // product's first price entry if the server response predates the
  // cart-currency-aware refactor — that's the "old" behavior and at
  // least keeps the row from crashing on missing data.
  const price = product.prices?.[0]
  const currency = (
    item.currency ?? (price as any)?.price_currency ?? 'KES'
  ).toUpperCase()

  return (
    <div className="flex items-start gap-4 py-4">
      {/* Thumbnail 4:5, 80px wide */}
      <Link href={`/product/${product.id}`} prefetch className="shrink-0">
        <div className="relative h-[100px] w-[80px] overflow-hidden rounded-sm bg-[var(--surface-sunken)]">
          <OptimizedImage src={img} alt={product.name} fill sizes="80px" />
        </div>
      </Link>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          href={`/product/${product.id}`}
          prefetch
          className="font-display text-[15px] font-medium text-[var(--text-primary)] transition-colors hover:text-[var(--accent)]"
        >
          <span className="line-clamp-2">{product.name}</span>
        </Link>
        {org?.name && (
          <span className="font-sans text-[13px] text-[var(--text-muted)]">
            by {org.name}
          </span>
        )}
        {/*
          Quantity intentionally not shown. Blyss only sells digital
          products and the cart-item row is always quantity 1, so a "Qty: 1"
          label adds noise without information. If the marketplace ever
          starts selling physical/seat-based goods this can be revived
          conditional on the product type.
        */}
      </div>

      {/* Price + actions */}
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className="font-display text-[15px] font-semibold tabular-nums text-[var(--text-primary)]">
          {fmtPrice(item.subtotal, currency)}
        </span>
        <div className="flex flex-col items-end gap-1">
          {onSaveForLater && (
            <button
              type="button"
              onClick={() => onSaveForLater(item)}
              disabled={isSaving || isRemoving}
              aria-label={`Save ${product.name} for later`}
              className={cn(
                'inline-flex items-center gap-1 font-sans text-[12px] text-[var(--text-secondary)] underline-offset-4 transition-colors hover:text-[var(--accent)] hover:underline',
                (isSaving || isRemoving) && 'opacity-50',
              )}
            >
              <FiHeart size={13} aria-hidden="true" />
              {isSaving ? 'Saving…' : 'Save for later'}
            </button>
          )}
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            disabled={isRemoving || isSaving}
            aria-label={`Remove ${product.name} from cart`}
            className={cn(
              'inline-flex items-center gap-1 font-sans text-[12px] text-[var(--danger)] transition-colors hover:underline',
              (isRemoving || isSaving) && 'opacity-50',
            )}
          >
            <FiTrash2 size={13} aria-hidden="true" />
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}
