'use client'

import Link from 'next/link'
import { FiTrash2 } from 'react-icons/fi'
import { OptimizedImage } from '@/components/Image/OptimizedImage'
import { schemas } from '@/lib/api'
import { cn } from '@/lib/utils'

interface CartItemRowProps {
  item: {
    id: string
    product: schemas['Product']
    quantity: number
    subtotal: number
  }
  onRemove: (itemId: string) => void
  isRemoving?: boolean
}

const fmtPrice = (cents: number, currency = 'KES') => {
  const major = cents / 100
  if (currency === 'KES') return `KSh ${major.toLocaleString('en-KE')}`
  if (currency === 'USD') return `$${major.toLocaleString('en-US')}`
  return `${major.toLocaleString()} ${currency}`
}

/**
 * CartItemRow — thumbnail + name + creator + qty + price + remove.
 * Per plan §6.6. Used in both the drawer and the full cart page.
 */
export const CartItemRow = ({ item, onRemove, isRemoving }: CartItemRowProps) => {
  const { product } = item
  const img = product.medias?.[0]?.public_url
  const org = (product as any).organization
  const price = product.prices?.[0]
  const currency = ((price as any)?.price_currency ?? 'KES').toUpperCase()

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
        <span className="mt-1 font-sans text-[12px] text-[var(--text-muted)]">
          Qty: {item.quantity}
        </span>
      </div>

      {/* Price + remove */}
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className="font-display text-[15px] font-semibold tabular-nums text-[var(--text-primary)]">
          {fmtPrice(item.subtotal, currency)}
        </span>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          disabled={isRemoving}
          aria-label={`Remove ${product.name} from cart`}
          className={cn(
            'inline-flex items-center gap-1 font-sans text-[12px] text-[var(--danger)] transition-colors hover:underline',
            isRemoving && 'opacity-50',
          )}
        >
          <FiTrash2 size={13} />
          Remove
        </button>
      </div>
    </div>
  )
}
