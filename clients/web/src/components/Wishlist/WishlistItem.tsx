'use client'

import ProductPriceLabel from '@/components/Products/ProductPriceLabel'
import { ProductThumbnail } from '@/components/Products/ProductThumbnail'
import { useRemoveFromWishlist } from '@/hooks/queries/wishlist'
import { useAddToCart } from '@/hooks/queries/cart'
import { schemas } from '@/lib/api'
import Button from '@/components/atoms/Button'
import { ShoppingCart, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

interface WishlistItemProps {
  item: {
    id: string
    product_id: string
    product: schemas['Product']
    created_at: string
  }
  currency: string
}

export const WishlistItem = ({ item, currency }: WishlistItemProps) => {
  const [isRemoving, setIsRemoving] = useState(false)
  const [isMovingToCart, setIsMovingToCart] = useState(false)
  const { mutate: removeFromWishlist } = useRemoveFromWishlist()
  const { mutate: addToCart } = useAddToCart()

  const product = item.product
  const organization = product.organization as schemas['Organization']

  const handleRemove = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setIsRemoving(true)
    removeFromWishlist(item.product_id, {
      onSettled: () => {
        setIsRemoving(false)
      },
    })
  }

  const handleMoveToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setIsMovingToCart(true)

    // Add to cart first
    addToCart(
      { productId: item.product_id, quantity: 1 },
      {
        onSuccess: (result) => {
          if (!result.error) {
            // Remove from wishlist after successful cart addition
            removeFromWishlist(item.product_id, {
              onSettled: () => {
                setIsMovingToCart(false)
              },
            })
          } else {
            setIsMovingToCart(false)
          }
        },
        onError: () => {
          setIsMovingToCart(false)
        },
      },
    )
  }

  return (
    <div className="group flex flex-col overflow-hidden rounded-lg bg-white transition-shadow hover:shadow-editorial dark:bg-on-surface">
      <Link href={`/product/${product.id}`} className="relative">
        <div className="relative overflow-hidden" style={{ aspectRatio: '4/5' }}>
          <ProductThumbnail product={product} size="medium" />
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex-1">
          <Link href={`/product/${product.id}`}>
            <h3 className="font-epilogue mb-1 line-clamp-2 text-base font-medium tracking-tight text-on-surface transition-colors hover:text-primary-700 dark:text-white dark:hover:text-primary-700">
              {product.name}
            </h3>
          </Link>

          <Link
            href={`/${organization.slug}`}
            className="mb-2 block text-xs text-on-surface-variant transition-colors hover:text-primary-700 dark:text-gray-400 dark:hover:text-primary-700"
          >
            by {organization.name}
          </Link>

          <div className="font-epilogue text-lg font-semibold tracking-tight text-on-surface dark:text-white">
            <ProductPriceLabel product={product} currency={currency} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleMoveToCart}
            disabled={isMovingToCart || isRemoving}
            loading={isMovingToCart}
            className="w-full gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            Move to Cart
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={isRemoving || isMovingToCart}
            loading={isRemoving}
            className="w-full gap-2 text-on-surface-variant hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </Button>
        </div>
      </div>
    </div>
  )
}
