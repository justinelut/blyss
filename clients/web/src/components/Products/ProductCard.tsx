'use client'

import ProductPriceLabel from '@/components/Products/ProductPriceLabel'
import { ProductThumbnail } from '@/components/Products/ProductThumbnail'
import { useAddToCart } from '@/hooks/queries/cart'
import { schemas } from '@/lib/api'
import Button from '@/components/atoms/Button'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface ProductCardProps {
  product: schemas['Product'] | schemas['CheckoutProduct']
  organization: schemas['Organization']
  currency: string
}

export const ProductCard = ({
  product,
  organization,
  currency,
}: ProductCardProps) => {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const { mutate: addToCart } = useAddToCart()

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

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

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Navigate directly to checkout for recurring products
    router.push(`/checkout/${product.id}`)
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      <ProductThumbnail product={product} size="medium" />

      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-medium">{product.name}</h3>

        {product.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {product.description}
          </p>
        )}

        <div className="text-base font-semibold">
          <ProductPriceLabel product={product} currency={currency} />
        </div>
      </div>

      <div className="mt-auto">
        {product.is_recurring ? (
          <Button fullWidth onClick={handleBuyNow} disabled={isLoading}>
            Buy Now
          </Button>
        ) : (
          <Button
            fullWidth
            onClick={handleAddToCart}
            disabled={isLoading}
            loading={isLoading}
          >
            Add to Cart
          </Button>
        )}
      </div>
    </div>
  )
}
