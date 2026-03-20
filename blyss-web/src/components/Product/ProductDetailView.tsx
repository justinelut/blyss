'use client'

import { ProductImageGallery } from '@/components/Product/ProductImageGallery'
import { RelatedProducts } from '@/components/Product/RelatedProducts'
import ProductPriceLabel from '@/components/Products/ProductPriceLabel'
import { WishlistButton } from '@/components/Wishlist/WishlistButton'
import { useAuth } from '@/hooks/auth'
import { useAddToCart } from '@/hooks/queries/cart'
import { schemas } from '@/lib/api'
import Button from '@/components/atoms/Button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface ProductDetailViewProps {
  product: schemas['Product']
}

export const ProductDetailView = ({ product }: ProductDetailViewProps) => {
  const router = useRouter()
  const { authenticated } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const { mutate: addToCart } = useAddToCart()

  const organization = product.organization as schemas['Organization']
  const currency = product.prices[0]?.price_currency || 'USD'

  const images =
    product.medias
      ?.filter((media) => media.public_url)
      .map((media) => media.public_url) || []

  const isAvailable = !product.is_archived

  const handleAddToCart = async () => {
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

  const handleBuyNow = () => {
    router.push(`/checkout/${product.id}`)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-2">
        <div className="order-1">
          <ProductImageGallery images={images} productName={product.name} />
        </div>

        <div className="order-2 flex flex-col gap-4 sm:gap-6">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{product.name}</h1>
            <div className="mt-3 text-xl font-semibold sm:mt-4 sm:text-2xl">
              <ProductPriceLabel product={product} currency={currency} />
            </div>
          </div>

          {product.description && (
            <div className="prose prose-sm dark:prose-invert sm:prose max-w-none">
              <p className="text-gray-600 dark:text-gray-400">
                {product.description}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:gap-3">
            {isAvailable ? (
              <>
                {product.is_recurring ? (
                  <Button
                    size="lg"
                    fullWidth
                    onClick={handleBuyNow}
                    disabled={isLoading}
                  >
                    Buy Now
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    fullWidth
                    onClick={handleAddToCart}
                    disabled={isLoading}
                    loading={isLoading}
                  >
                    Add to Cart
                  </Button>
                )}
              </>
            ) : (
              <div className="rounded-lg bg-gray-100 p-4 text-center dark:bg-gray-800">
                <span className="text-lg font-medium text-gray-600 dark:text-gray-400">
                  Out of Stock
                </span>
              </div>
            )}

            {authenticated && (
              <WishlistButton
                productId={product.id}
                variant="outline"
                size="lg"
                fullWidth
              />
            )}
          </div>

          <div className="border-t border-gray-200 pt-4 sm:pt-6 dark:border-gray-800">
            <h3 className="mb-3 text-base font-semibold sm:mb-4 sm:text-lg">
              Creator
            </h3>
            <Link
              href={`/${organization.slug}`}
              className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50 sm:gap-4 sm:p-4 dark:border-gray-800 dark:hover:bg-gray-900"
            >
              {organization.avatar_url && (
                <img
                  src={organization.avatar_url}
                  alt={organization.name}
                  className="h-10 w-10 rounded-full sm:h-12 sm:w-12"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{organization.name}</div>
                {organization.bio && (
                  <div className="line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                    {organization.bio}
                  </div>
                )}
              </div>
            </Link>
          </div>
        </div>
      </div>

      <RelatedProducts
        productId={product.id}
        currentOrganization={organization}
        currency={currency}
      />

      <div className="mt-8 space-y-6 sm:mt-12 sm:space-y-8">
        <ProductRatingSummary productId={product.id} />

        <ReviewForm
          productId={product.id}
          orderId={undefined}
          hasVerifiedPurchase={false}
        />

        <ReviewList productId={product.id} />
      </div>
    </div>
  )
}
