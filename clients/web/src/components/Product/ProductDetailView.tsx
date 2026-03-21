'use client'

import { ProductImageGallery } from '@/components/Product/ProductImageGallery'
import { RelatedProducts } from '@/components/Product/RelatedProducts'
import ProductPriceLabel from '@/components/Products/ProductPriceLabel'
import { ProductRatingSummary } from '@/components/Review/ProductRatingSummary'
import { ReviewForm } from '@/components/Review/ReviewForm'
import { ReviewList } from '@/components/Review/ReviewList'
import { WishlistButton } from '@/components/Wishlist/WishlistButton'
import { useAuth } from '@/hooks/auth'
import { useAddToCart } from '@/hooks/queries/cart'
import { schemas } from '@/lib/api'
import Button from '@/components/atoms/Button'
import { useToast } from '@/components/Toast/use-toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface ProductDetailViewProps {
  product: schemas['Product']
}

export const ProductDetailView = ({ product }: ProductDetailViewProps) => {
  const router = useRouter()
  const { authenticated } = useAuth()
  const { toast } = useToast()
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
          onSuccess: () => {
            toast({
              title: 'Success',
              description: 'Item added to cart',
              variant: 'default',
            })
          },
          onSettled: () => {
            setIsLoading(false)
          },
        },
      )
    } catch (error) {
      setIsLoading(false)
      toast({
        title: 'Error',
        description: 'Failed to add item to cart',
        variant: 'destructive',
      })
    }
  }

  const handleBuyNow = () => {
    router.push(`/checkout/${product.id}`)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Product Detail Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Image Gallery */}
        <div className="order-1">
          <ProductImageGallery images={images} productName={product.name} />
        </div>

        {/* Product Info */}
        <div className="order-2 flex flex-col gap-6">
          {/* Title and Price */}
          <div>
            <h1 className="font-epilogue text-on-surface text-3xl font-semibold tracking-tight sm:text-4xl">
              {product.name}
            </h1>
            <div className="font-epilogue text-primary mt-4 text-2xl font-semibold sm:text-3xl">
              <ProductPriceLabel product={product} currency={currency} />
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="prose prose-sm text-on-surface-variant dark:prose-invert sm:prose max-w-none">
              <p>{product.description}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            {isAvailable ? (
              <>
                {product.is_recurring ? (
                  <Button
                    size="lg"
                    fullWidth
                    onClick={handleBuyNow}
                    disabled={isLoading}
                    className="bg-primary hover:bg-primary/90 text-white"
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
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    Add to Cart
                  </Button>
                )}
              </>
            ) : (
              <div className="bg-surface-container-low rounded-lg p-4 text-center">
                <span className="text-on-surface-variant text-lg font-medium">
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

          {/* File Details Section */}
          {product.medias && product.medias.length > 0 && (
            <div className="bg-surface-container-low rounded-lg p-6">
              <h3 className="font-epilogue text-on-surface mb-4 text-lg font-semibold">
                File Details
              </h3>
              <div className="text-on-surface-variant space-y-2 text-sm">
                {product.medias.map((media, index) => (
                  <div key={index} className="flex justify-between">
                    <span>Format:</span>
                    <span className="font-medium">
                      {media.mime_type?.split('/')[1]?.toUpperCase() || 'N/A'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Creator Profile Card */}
          <div className="bg-surface-container-lowest shadow-editorial rounded-lg p-6">
            <h3 className="font-epilogue text-on-surface mb-4 text-lg font-semibold">
              Creator
            </h3>
            <Link
              href={`/${organization.slug}`}
              className="flex items-center gap-4 transition-opacity hover:opacity-80"
            >
              {organization.avatar_url && (
                <img
                  src={organization.avatar_url}
                  alt={organization.name}
                  className="h-16 w-16 rounded-full object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-epilogue text-on-surface text-lg font-semibold">
                  {organization.name}
                </div>
                {organization.bio && (
                  <div className="text-on-surface-variant mt-1 line-clamp-2 text-sm">
                    {organization.bio}
                  </div>
                )}
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Related Products */}
      <div className="mt-20">
        <RelatedProducts
          productId={product.id}
          currentOrganization={organization}
          currency={currency}
        />
      </div>

      {/* Reviews Section */}
      <div className="mt-20 space-y-8">
        <h2 className="font-epilogue text-on-surface text-2xl font-semibold sm:text-3xl">
          Reviews & Ratings
        </h2>

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
