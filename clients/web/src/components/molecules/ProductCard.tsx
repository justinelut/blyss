'use client'

import { twMerge } from 'tailwind-merge'
import Button from '../atoms/Button'
import Pill from '../atoms/Pill'

interface ProductMedia {
  public_url: string
}

interface ProductOrganization {
  name: string
  slug: string
}

interface ProductPrice {
  amount_type: 'fixed' | 'free' | 'custom'
  price_amount?: number
  price_currency?: string
}

interface Product {
  id: string
  name: string
  medias: ProductMedia[]
  organization: ProductOrganization
  prices: ProductPrice[]
  metadata?: Record<string, any>
}

interface ProductCardProps {
  product: Product
  onClick?: () => void
  className?: string
  priority?: boolean
}

export const ProductCard = ({
  product,
  onClick,
  className,
  priority = false,
}: ProductCardProps) => {
  const coverUrl =
    product.medias.length > 0 ? product.medias[0].public_url : null
  const category = product.metadata?.category as string | undefined
  const creatorName = product.organization?.name || 'Unknown Creator'

  const formatPrice = (product: Product) => {
    const price = product.prices.find(
      (p: ProductPrice) =>
        p.amount_type === 'fixed' || p.amount_type === 'free',
    )

    if (!price) return null

    if (price.amount_type === 'free') {
      return 'Free'
    }

    if (
      price.amount_type === 'fixed' &&
      price.price_amount &&
      price.price_currency
    ) {
      const amount = price.price_amount / 100
      const currency = price.price_currency
      return `${currency} ${amount.toLocaleString()}`
    }

    return null
  }

  const priceLabel = formatPrice(product)

  return (
    <div
      className={twMerge(
        'group flex cursor-pointer flex-col gap-3 rounded-lg border border-gray-200 p-4 transition-all hover:border-gray-300 hover:shadow-md dark:border-gray-800 dark:hover:border-gray-700',
        className,
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
    >
      {/* Product Image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg
              className="h-12 w-12 text-gray-300 dark:text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-base font-semibold text-gray-900 dark:text-white">
            {product.name}
          </h3>
          {category && (
            <Pill color="blue" className="shrink-0">
              {category}
            </Pill>
          )}
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400">
          {creatorName}
        </p>

        {priceLabel && (
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {priceLabel}
          </p>
        )}
      </div>

      {/* View Product Button */}
      <Button
        variant="outline"
        fullWidth
        onClick={(e) => {
          e.stopPropagation()
          onClick?.()
        }}
      >
        View Product
      </Button>
    </div>
  )
}
