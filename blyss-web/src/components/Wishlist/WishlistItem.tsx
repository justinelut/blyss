'use client'

import ProductPriceLabel from '@/components/Products/ProductPriceLabel'
import { ProductThumbnail } from '@/components/Products/ProductThumbnail'
import { useRemoveFromWishlist } from '@/hooks/queries/wishlist'
import { schemas } from '@polar-sh/client'
import Button from '@polar-sh/ui/components/atoms/Button'
import { Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

interface WishlistItemProps {
  item: {
    id: string
    product_id: string
    product: schemas['Product']
    created_at: string
  }
}

export const WishlistItem = ({ item }: WishlistItemProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const { mutate: removeFromWishlist } = useRemoveFromWishlist()

  const product = item.product
  const organization = product.organization as schemas['Organization']
  const currency = product.prices[0]?.price_currency || 'USD'

  const handleRemove = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setIsLoading(true)
    removeFromWishlist(item.product_id, {
      onSettled: () => {
        setIsLoading(false)
      },
    })
  }

  return (
    <div className="flex gap-3 rounded-lg border border-gray-200 p-3 sm:gap-4 sm:p-4 dark:border-gray-800">
      <Link href={`/product/${product.id}`} className="shrink-0">
        <ProductThumbnail product={product} size="small" />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:gap-2">
        <Link href={`/product/${product.id}`}>
          <h3 className="line-clamp-2 text-base font-medium hover:underline sm:text-lg">
            {product.name}
          </h3>
        </Link>

        {product.description && (
          <p className="line-clamp-2 text-xs text-gray-600 sm:text-sm dark:text-gray-400">
            {product.description}
          </p>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-600 sm:text-sm dark:text-gray-400">
          <span>by</span>
          <Link
            href={`/${organization.slug}`}
            className="truncate font-medium hover:underline"
          >
            {organization.name}
          </Link>
        </div>

        <div className="mt-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold sm:text-base">
            <ProductPriceLabel product={product} currency={currency} />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={isLoading}
            loading={isLoading}
            className="gap-2 self-start sm:self-auto"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sm:inline">Remove</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
