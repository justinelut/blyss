'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { schemas } from '@/lib/api'
import { useAddToCart } from '@/hooks/queries/cart'
import { useIsInWishlist, useAddToWishlist, useRemoveFromWishlist } from '@/hooks/queries/wishlist'
import { useAuth } from '@/hooks'
import {
  ProductImageGallery,
  ProductInfoColumn,
  ProductTabs,
  ProductReviews,
  CreatorInlineCard,
  RelatedProducts,
  RecentlyViewed,
  recordProductView,
} from '@/components/ProductDetail'

interface ProductDetailClientProps {
  product: schemas['Product']
}

/**
 * ProductDetailClient — client island orchestrating the PDP interactivity.
 * Renders the two-column layout (gallery left / info right), tabs, creator
 * card, related, and recently viewed.
 */
export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const router = useRouter()
  const { authenticated } = useAuth()
  const { mutate: addToCart, status: cartStatus } = useAddToCart()
  const { data: wishlistCheck } = useIsInWishlist(product.id)
  const { mutate: addWishlist } = useAddToWishlist()
  const { mutate: removeWishlist } = useRemoveFromWishlist()

  const isInWishlist = !!(wishlistCheck as any)?.is_in_wishlist
  const org = (product as any).organization as
    | { name?: string; slug?: string; avatar_url?: string | null; bio?: string | null }
    | undefined

  const images = (product.medias ?? [])
    .filter((m) => m.public_url)
    .map((m) => m.public_url!)

  // Record view for recently-viewed
  useEffect(() => { recordProductView(product) }, [product])

  const handleBuy = () => {
    if (product.is_recurring) {
      // Subscriptions skip cart, go direct to checkout per §6.5
      router.push(`/checkout?product_id=${product.id}`)
    } else {
      const price = product.prices?.[0]
      const amount = (price as any)?.price_amount ?? 0
      if (amount === 0) {
        // Free product — claim instantly (phase 5.7 wires real handler)
        router.push(`/checkout?product_id=${product.id}`)
      } else {
        addToCart({ productId: product.id, quantity: 1 })
      }
    }
  }

  const handleWishlist = () => {
    if (!authenticated) {
      router.push(`/login?return_to=${encodeURIComponent(`/product/${product.id}`)}`)
      return
    }
    if (isInWishlist) removeWishlist(product.id)
    else addWishlist(product.id)
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/product/${product.id}`
    if (navigator.share) {
      try { await navigator.share({ title: product.name, url }) } catch {}
    } else {
      await navigator.clipboard.writeText(url)
    }
  }

  return (
    <div className="mx-auto max-w-[1280px] px-6 md:px-16">
      {/* Two-column layout: gallery sticky left, info right */}
      <div className="grid grid-cols-1 gap-12 py-8 md:py-12 lg:grid-cols-[1fr_420px] lg:gap-16">
        {/* Left — gallery (sticky on desktop) */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <ProductImageGallery images={images} productName={product.name} />
        </div>

        {/* Right — info + creator card */}
        <div className="flex flex-col gap-10">
          <ProductInfoColumn
            product={product}
            onBuy={handleBuy}
            onWishlistToggle={handleWishlist}
            onShare={handleShare}
            isInWishlist={isInWishlist}
            isBuyLoading={cartStatus === 'pending'}
          />

          {org && (
            <CreatorInlineCard
              name={org.name ?? 'Creator'}
              slug={org.slug ?? ''}
              avatarUrl={org.avatar_url}
              bio={org.bio}
            />
          )}
        </div>
      </div>

      {/* Tabs — full width below the grid so all four tab labels fit and the
          panels (description, included, benefits, reviews) get readable
          measure (was constrained to the 420px right column where 'Reviews'
          got truncated to 'Revie'). */}
      <div className="border-t border-[var(--border)] pt-8">
        <ProductTabs
          product={product}
          reviewsContent={<ProductReviews productId={product.id} />}
        />
      </div>

      {/* Related + Recently viewed */}
      <div className="flex flex-col gap-20 pb-16 md:pb-24 pt-12">
        <RelatedProducts productId={product.id} />
        <RecentlyViewed currentId={product.id} />
      </div>
    </div>
  )
}
