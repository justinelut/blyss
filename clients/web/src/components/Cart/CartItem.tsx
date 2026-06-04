'use client'
import { useRemoveFromCart } from '@/hooks/queries/cart'
import { schemas } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

interface CartItemProps {
  item: {
    id: string
    product: schemas['Product']
    quantity: number
    subtotal: number
  }
  currency: string
}

export const CartItem = ({ item, currency }: CartItemProps) => {
  const { mutate: removeItem, isPending } = useRemoveFromCart()
  const [showConfirm, setShowConfirm] = useState(false)

  const handleRemove = () => {
    if (!showConfirm) {
      setShowConfirm(true)
      return
    }
    removeItem({ itemId: item.id })
  }

  const handleCancel = () => {
    setShowConfirm(false)
  }

  // Find price matching selected currency, fallback to first price
  const matchingPrice = item.product.prices?.find(
    (p) => p.price_currency === currency,
  )
  const price = matchingPrice || item.product.prices?.[0]
  const priceAmount = price?.price_amount ?? 0
  const priceCurrency = price?.price_currency ?? currency

  // Get product image
  const productImage = item.product.medias?.[0]?.public_url

  // Get creator name
  const creatorName = item.product.organization?.name || 'Unknown Creator'
  const creatorSlug = item.product.organization?.slug

  return (
    <article className="border-opacity-15 flex items-start gap-6 border-b border-[var(--color-outline-variant)] p-6 last:border-b-0" aria-label={`${item.product.name} in cart`}>
      {/* Product Image */}
      {productImage && (
        <Link href={`/product/${item.product.slug}`} aria-label={`View ${item.product.name} details`}>
          <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md bg-[var(--color-surface-container-low)]">
            <Image
              src={productImage}
              alt={`${item.product.name} - Product image`}
              fill
              className="object-cover"
            />
          </div>
        </Link>
      )}

      {/* Product Info */}
      <div className="flex-1">
        <Link href={`/product/${item.product.slug}`}>
          <h3 className="font-epilogue text-base font-medium text-[var(--color-on-surface)] hover:text-[var(--color-primary)] dark:text-[var(--color-on-surface)]">
            {item.product.name}
          </h3>
        </Link>
        {creatorSlug && (
          <Link href={`/${creatorSlug}`}>
            <p className="font-inter mt-1 text-sm text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)]">
              by {creatorName}
            </p>
          </Link>
        )}
        {item.product.description && (
          <p className="font-inter mt-2 line-clamp-2 text-sm text-[var(--color-on-surface-variant)]">
            {item.product.description}
          </p>
        )}
        <div className="font-inter mt-3 flex items-center gap-4 text-sm">
          <span className="text-[var(--color-on-surface)]" aria-label={`Price: ${formatCurrency('compact')(priceAmount, priceCurrency)}`}>
            {formatCurrency('compact')(priceAmount, priceCurrency)}
          </span>
          {/*
            Quantity intentionally not shown — Blyss is digital-only and the
            cart row is always quantity 1.
          */}
        </div>
      </div>

      {/* Price and Actions */}
      <div className="flex flex-col items-end gap-3">
        <div className="font-epilogue text-lg font-medium text-[var(--color-on-surface)]" aria-label={`Subtotal: ${formatCurrency('compact')(item.subtotal, currency)}`}>
          {formatCurrency('compact')(item.subtotal, currency)}
        </div>
        {showConfirm ? (
          <div className="flex gap-2" role="group" aria-label="Confirm removal">
            <Button
              size="sm"
              variant="destructive"
              onClick={handleRemove}
              disabled={isPending}
              className="font-inter"
              aria-label={`Confirm remove ${item.product.name} from cart`}
            >
              {isPending ? 'Removing...' : 'Confirm'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={isPending}
              className="font-inter"
              aria-label="Cancel removal"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRemove}
            disabled={isPending}
            className="font-inter text-[var(--color-destructive)] hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950 dark:hover:text-red-300"
            aria-label={`Remove ${item.product.name} from cart`}
          >
            <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
            Remove
          </Button>
        )}
      </div>
    </article>
  )
}
