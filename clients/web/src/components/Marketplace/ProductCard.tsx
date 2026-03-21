'use client'

import ProductPriceLabel from '@/components/Products/ProductPriceLabel'
import { OptimizedImage } from '@/components/Image/OptimizedImage'
import { useAddToCart } from '@/hooks/queries/cart'
import { schemas } from '@/lib/api'
import Button from '@/components/atoms/Button'
import Link from 'next/link'
import { useState } from 'react'

interface ProductCardProps {
  product: schemas['Product'] | schemas['CheckoutProduct']
  organization: schemas['Organization']
  currency: string
  onAddToCart?: (productId: string) => void
  onAddToWishlist?: (productId: string) => void
}

export const ProductCard = ({
  product,
  organization,
  currency,
  onAddToCart,
  onAddToWishlist,
}: ProductCardProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const { mutate: addToCart } = useAddToCart()

  const handleAddToCart = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (onAddToCart) {
      onAddToCart(product.id)
      return
    }

    setIsLoading(true)
    try {
      addToCart(
        { productId: product.id, quantity: 1 },
        {
          onSettled: () => {
            setIsLoading(false)
          },
        },
      )
    } catch (error) {
      setIsLoading(false)
    }
  }

  const handleBuyNow = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Navigation will be handled by Link
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Allow Enter or Space to trigger the action button
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (product.is_recurring) {
        handleBuyNow(e)
      } else {
        handleAddToCart(e)
      }
    }
  }

  const productImage = product.medias?.[0]?.public_url

  return (
    <article
      className="group flex cursor-pointer flex-col gap-3 rounded-lg bg-white p-4 transition-all hover:shadow-[0_12px_32px_rgba(27,28,27,0.06)] dark:bg-[#1b1c1b]"
      aria-label={`${product.name} by ${organization.name}`}
    >
      <Link
        href={`/product/${product.id}`}
        prefetch={true}
        className="flex flex-col gap-3"
        aria-label={`View details for ${product.name}`}
      >
        {/* Product Image with 4:5 aspect ratio - optimized with Next.js Image */}
        <div className="relative w-full overflow-hidden rounded-md">
          <OptimizedImage
            src={productImage}
            alt={`${product.name} - Product image`}
            fill
            aspectRatio="4/5"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="rounded-md"
          />
        </div>

        {/* Product Info */}
        <div className="flex flex-1 flex-col gap-2">
          <h3 className="font-epilogue line-clamp-2 text-base font-semibold tracking-tight text-[#1b1c1b] dark:text-white">
            {product.name}
          </h3>

          <p className="text-sm text-[#594139] dark:text-gray-400">
            {organization.name}
          </p>

          <div
            className="text-2xl font-semibold tracking-tight text-[#1b1c1b] dark:text-white"
            aria-label={`Price: ${currency}`}
          >
            <ProductPriceLabel product={product} currency={currency} />
          </div>
        </div>
      </Link>

      {/* Action Buttons */}
      <div className="mt-auto">
        {product.is_recurring ? (
          <Link href={`/checkout/${product.id}`} prefetch={true}>
            <Button
              fullWidth
              onClick={handleBuyNow}
              disabled={isLoading}
              aria-label={`Buy ${product.name} now`}
            >
              Buy Now
            </Button>
          </Link>
        ) : (
          <Button
            fullWidth
            onClick={handleAddToCart}
            disabled={isLoading}
            loading={isLoading}
            aria-label={`Add ${product.name} to cart`}
          >
            Add to Cart
          </Button>
        )}
      </div>
    </article>
  )
}
