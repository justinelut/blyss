'use client'

/* Hallmark · macrostructure: Split Studio · genre: editorial
 * theme: blyss-design (light cream + burnt orange #C2410C accent)
 * sections: Sticky media gallery (1.15fr) · Editorial buy-box (1fr) ·
 *           Tabs (overview/description) · Reviews · Related · Recently viewed
 * nav: N5/N9 (inherited) · footer: Ft5 (inherited)
 * contrast: pass · slop: pass (gates 1, 2, 7, 8, 36, 51–55, 66, 67)
 *
 * Reference DNA: Aimé Leon Dore product page — sticky 4:5 gallery left,
 * editorial buy-box right with display-size price + tabular numerals + one
 * primary CTA, full-width tabs below, 64ch description + reviews columns.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { schemas } from '@/lib/api'
import { useAddToCart } from '@/hooks/queries/cart'
import { useIsInWishlist, useAddToWishlist, useRemoveFromWishlist } from '@/hooks/queries/wishlist'
import { useAuth } from '@/hooks'
import { DonationModal } from '@/components/Donation/DonationModal'
import { Modal } from '@/components/Modal'
import { AuthModal } from '@/components/Auth/AuthModal'
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
 *
 * Layout: Two-column editorial grid (gallery left / info right), full-width
 * tabs section, then related & recently viewed. Premium spacing rhythm per
 * §3.4: 96px desktop / 56px mobile between major sections.
 */
export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const router = useRouter()
  const { authenticated } = useAuth()
  const { mutate: addToCart, status: cartStatus } = useAddToCart()
  const { data: wishlistCheck } = useIsInWishlist(product.id, authenticated)
  const { mutate: addWishlist } = useAddToWishlist()
  const { mutate: removeWishlist } = useRemoveFromWishlist()
  const [tipModalOpen, setTipModalOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)

  const isInWishlist = !!(wishlistCheck as any)?.is_in_wishlist
  const org = (product as any).organization as
    | { name?: string; slug?: string; avatar_url?: string | null; bio?: string | null }
    | undefined

  const images = (product.medias ?? [])
    .filter((m) => m.public_url)
    .map((m) => m.public_url!)

  useEffect(() => { recordProductView(product) }, [product])

  const handleBuy = () => {
    if (!authenticated) {
      setAuthModalOpen(true)
      return
    }
    if (product.is_recurring) {
      router.push(`/checkout?product_id=${product.id}`)
    } else {
      const price = product.prices?.[0]
      const amount = (price as any)?.price_amount ?? 0
      if (amount === 0) {
        router.push(`/checkout?product_id=${product.id}`)
      } else {
        addToCart({ productId: product.id, quantity: 1 })
      }
    }
  }

  const handleWishlist = () => {
    if (!authenticated) {
      setAuthModalOpen(true)
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
    <article className="mx-auto max-w-[1280px] px-5 pb-24 sm:px-8 md:px-16 lg:pb-0">
      {/* Two-column: gallery sticky left, buy-box right */}
      <div className="grid grid-cols-1 gap-10 pt-8 pb-16 md:pt-12 md:pb-24 lg:grid-cols-[1.15fr_1fr] lg:gap-20 xl:gap-24">
        {/* Gallery — sticky on desktop so buy-box scrolls independently */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ProductImageGallery images={images} productName={product.name} />
        </div>

        {/* Info column — buy-box + creator card */}
        <div className="flex flex-col gap-12 lg:pt-2">
          <ProductInfoColumn
            product={product}
            onBuy={handleBuy}
            onWishlistToggle={handleWishlist}
            onShare={handleShare}
            isInWishlist={isInWishlist}
            isBuyLoading={cartStatus === 'pending'}
            onTip={org?.slug ? () => setTipModalOpen(true) : undefined}
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

      {/* Tabs — full-width editorial section */}
      <section className="border-t border-[var(--border)] py-14 md:py-20">
        <ProductTabs
          product={product}
          reviewsContent={<ProductReviews productId={product.id} />}
        />
      </section>

      {/* Related + Recently viewed */}
      <div className="flex flex-col gap-14 pb-16 md:gap-20 md:pb-24">
        <RelatedProducts productId={product.id} />
        <RecentlyViewed currentId={product.id} />
      </div>

      {org?.slug && (
        <DonationModal
          isOpen={tipModalOpen}
          onClose={() => setTipModalOpen(false)}
          creatorSlug={org.slug}
          creatorName={org.name ?? 'this creator'}
        />
      )}

      <Modal
        title="Log In"
        isShown={authModalOpen}
        hide={() => setAuthModalOpen(false)}
        modalContent={
          <AuthModal
            returnTo={`/product/${product.id}`}
            returnParams={{}}
          />
        }
      />

      {/* Sticky mobile buy bar — fixed at the bottom on phones so the buy CTA
          is always one tap away while the buyer scrolls description / reviews.
          Hidden on lg+ where the buy-box itself is visible alongside the
          sticky gallery. */}
      <MobileBuyBar
        product={product}
        onBuy={handleBuy}
        isBuyLoading={cartStatus === 'pending'}
      />
    </article>
  )
}

/** Sticky bottom CTA bar shown on mobile only. Mirrors the buy-box's primary
 *  action so the buyer never has to scroll back up. Respects safe-area inset
 *  on iOS via env(safe-area-inset-bottom). */
function MobileBuyBar({
  product,
  onBuy,
  isBuyLoading,
}: {
  product: schemas['Product']
  onBuy: () => void
  isBuyLoading: boolean
}) {
  const prices = (product.prices ?? []) as Array<{
    price_amount?: number
    price_currency?: string
  }>
  const price = prices[0]
  const amount = price?.price_amount ?? 0
  const currency = (price?.price_currency ?? 'usd').toUpperCase()
  const major = amount / 100
  const priceLabel =
    amount === 0
      ? 'Free'
      : currency === 'KES'
        ? `KSh ${major.toLocaleString('en-KE')}`
        : currency === 'USD'
          ? `US$ ${major.toLocaleString('en-US')}`
          : `${currency} ${major.toLocaleString()}`
  const ctaLabel = product.is_recurring
    ? `Subscribe · ${priceLabel} / ${product.recurring_interval ?? 'month'}`
    : amount === 0
      ? 'Get it free'
      : `Buy · ${priceLabel}`

  return (
    <div
      role="region"
      aria-label="Buy product"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Price
          </p>
          <p className="truncate font-display text-[18px] font-semibold leading-none tabular-nums text-[var(--text-primary)]">
            {priceLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={onBuy}
          disabled={isBuyLoading || product.is_archived}
          aria-busy={isBuyLoading}
          className="inline-flex h-12 shrink-0 items-center justify-center rounded-md bg-[var(--accent)] px-5 font-sans text-[14px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          style={{ whiteSpace: 'nowrap' }}
        >
          {isBuyLoading ? 'Adding…' : ctaLabel}
        </button>
      </div>
    </div>
  )
}
