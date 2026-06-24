'use client'

import * as React from 'react'
import Link from 'next/link'
import { useReducedMotion, motion } from 'motion/react'
import { FiShoppingCart, FiStar } from 'react-icons/fi'
import { schemas } from '@/lib/api'
import { OptimizedImage } from '@/components/Image/OptimizedImage'
import { typography } from '@/design'
import { cn } from '@/lib/utils'
import { useAddToCart } from '@/hooks/queries/cart'
import { useCreateProductCheckout } from '@/hooks/queries/checkouts'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/Toast/use-toast'
import { useDisplayCurrency } from './CurrencyProvider'
import { CardWishlistButton } from './CardWishlistButton'

type Product = schemas['Product']

interface MarketplaceProductCardProps {
  product: Product
  /** Override the link target — defaults to /product/[id] */
  href?: string
  /** Hide the creator line (used on creator storefront pages) */
  hideCreator?: boolean
  /** Hide the hover-to-save heart pill (e.g. on the wishlist page where
   *  the parent already renders its own remove-from-wishlist control). */
  hideWishlistButton?: boolean
  /** Hide the inline 'Add to cart' button. Pass true on surfaces where
   *  the parent owns its own cart action (e.g. the wishlist page already
   *  renders a move-to-cart pill, or for seed/placeholder cards). */
  hideAddToCart?: boolean
  className?: string
}

const formatPrice = (product: Product, preferredCurrency?: string): string => {
  // Pick the price in the visitor's currency when the creator set one;
  // otherwise fall back to the first price. We never convert — the grid is
  // already filtered to products priced in the visitor's currency.
  const prices = (product.prices ?? []) as any[]
  if (prices.length === 0) return ''
  const preferred = preferredCurrency?.toLowerCase()
  const price =
    (preferred &&
      prices.find(
        (p) => (p?.price_currency ?? '').toLowerCase() === preferred,
      )) ||
    prices[0]
  // price.price_amount is in minor units (e.g. KES cents = 1/100 of KES)
  const amount = (price as any).price_amount ?? 0
  const currency = ((price as any).price_currency ?? 'KES').toUpperCase()
  const major = amount / 100
  // Use UNAMBIGUOUS currency labels so an international visitor isn't left
  // guessing what "$" or a bare number means. KES keeps the local "KSh"
  // convention; USD shows "US$"; everything else prefixes the ISO code.
  if (currency === 'KES') return `KSh ${major.toLocaleString('en-KE')}`
  if (currency === 'USD') return `US$ ${major.toLocaleString('en-US')}`
  return `${currency} ${major.toLocaleString()}`
}

/** Cadence suffix for recurring products, e.g. "/ month" or "/ 3 months". */
const recurringCadence = (product: Product): string => {
  if (!product.is_recurring) return ''
  const interval = (product as any).recurring_interval ?? 'month'
  const count = (product as any).recurring_interval_count ?? 1
  const unit = interval === 'year' ? 'year' : 'month'
  return count === 1 ? ` / ${unit}` : ` / ${count} ${unit}s`
}

const formatCount = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}K`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

/**
 * Tonal placeholder palette for cards without uploaded media. Stays inside the
 * Blyss palette tokens — variations come from background tone + accent tint.
 * Picked deterministically from product id so the home grid doesn't render
 * eight identical tiles. (Spec §3.4: real photography or editorial placeholder.)
 */
const PLACEHOLDER_TONES = [
  { bg: 'bg-[var(--surface-sunken)]', mark: 'text-[var(--text-muted)]' },
  { bg: 'bg-[var(--surface)]', mark: 'text-[var(--text-secondary)]' },
  { bg: 'bg-[var(--surface-elevated)]', mark: 'text-[var(--text-secondary)]' },
  { bg: 'bg-[var(--accent)]', mark: 'text-[var(--accent-foreground)]' },
] as const

const pickTone = (key: string) => {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return PLACEHOLDER_TONES[h % PLACEHOLDER_TONES.length]
}

/**
 * MarketplaceProductCard — the canonical product card for the marketplace
 * surface. Used in trending grids, featured sections, related products, etc.
 *
 * Per plan §3.4 + §6.1 trending products section:
 * - 4:5 aspect ratio image (editorial-tall)
 * - No drop-shadow, no border — sits on background tone
 * - Hover: image scales 1.04, accent underline appears under product name
 * - No "Add to cart" button on the card itself (decision happens on PDP)
 * - Tabular numerals on price
 */
export const MarketplaceProductCard = ({
  product,
  href,
  hideCreator,
  hideWishlistButton,
  hideAddToCart,
  className,
}: MarketplaceProductCardProps) => {
  const reduce = useReducedMotion()
  const displayCurrency = useDisplayCurrency()
  const router = useRouter()
  const { mutate: addToCart, isPending: isAddingToCart } = useAddToCart()
  const { mutate: createCheckout, isPending: isCreatingCheckout } =
    useCreateProductCheckout()
  const productImage = product.medias?.[0]?.public_url
  // Seed-data placeholders use ids prefixed "seed_" — they have no PDP, so
  // route the click to the marketplace browse page instead of 404'ing.
  const isSeed = typeof product.id === 'string' && product.id.startsWith('seed_')
  const linkHref = href ?? (isSeed ? '/marketplace' : `/product/${product.id}`)
  const creatorName =
    (product as any).organization?.name ??
    (product as any).organization?.slug ??
    null

  // Buy CTA visibility: the inline cart pill only makes sense on real
  // products that go through the cart. Seed cards have no real PDP, so
  // we'd add a row that can never resolve.
  // Subscriptions never go through the cart per §6.5 — they create a
  // checkout directly — so on the card we route them to a checkout
  // session under the same button. Free products do the same (no
  // payment, no cart, just a checkout).
  const buyCtaEnabled = !isSeed && !hideAddToCart
  const isRecurring = !!(product as any).is_recurring
  const firstAmount =
    ((product as any).prices?.[0] as { price_amount?: number } | undefined)
      ?.price_amount ?? 0
  const goesThroughCheckout = isRecurring || firstAmount === 0

  const onBuyClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isSeed) return
    if (goesThroughCheckout) {
      createCheckout(product.id, {
        onSuccess: ({ client_secret }) => {
          router.push(`/checkout/${client_secret}`)
        },
        onError: () => {
          toast({
            title: 'Could not start checkout',
            description: 'Try again, or open the product page.',
            variant: 'error',
            duration: 3500,
          })
        },
      })
    } else {
      addToCart(
        { productId: product.id, quantity: 1 },
        {
          onSuccess: () => {
            toast({
              title: 'Added to cart',
              description: 'Tap the cart in the header to check out.',
              duration: 2500,
            })
          },
          onError: () => {
            toast({
              title: 'Could not add to cart',
              description: 'Try again in a moment, or open the product page.',
              variant: 'error',
              duration: 3500,
            })
          },
        },
      )
    }
  }
  const buyBusy = isAddingToCart || isCreatingCheckout
  const buyLabel = goesThroughCheckout
    ? isRecurring
      ? 'Subscribe'
      : 'Get it free'
    : 'Add to cart'

  return (
    <Link
      href={linkHref}
      prefetch
      aria-label={`${product.name}${creatorName ? ` by ${creatorName}` : ''}`}
      className={cn('group block', className)}
    >
      {/* Image — 4:5 aspect, hover scale; typographic placeholder when no media */}
      <div className="relative w-full overflow-hidden rounded-md bg-[var(--surface-sunken)]">
        {/* Etsy-style quick-save: small heart at top-right, hover-revealed on
            desktop, always visible on mobile. Skipped on seed products
            (id starts with "seed_") which have no real PDP, and when the
            parent owns its own wishlist control (e.g. the wishlist page). */}
        {!isSeed && !hideWishlistButton && (
          <CardWishlistButton productId={product.id} />
        )}
        {/* Add to cart / Subscribe — bottom-right pill, always visible on
            mobile so the buyer can stay in the grid. Mirrors the wishlist
            page's move-to-cart pill so visual rhythm matches across the
            site. e.preventDefault + stopPropagation prevents the wrapping
            <Link> from navigating when the buyer taps the button. */}
        {buyCtaEnabled && (
          <button
            type="button"
            onClick={onBuyClick}
            disabled={buyBusy}
            aria-label={buyLabel}
            className={cn(
              'absolute right-3 bottom-3 z-10 inline-flex h-9 items-center gap-1.5 rounded-full px-3.5',
              'bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm',
              'font-sans text-[12px] font-medium transition-all',
              'hover:scale-[1.03] hover:bg-[var(--accent-hover)]',
              'disabled:cursor-not-allowed disabled:opacity-60',
            )}
          >
            <FiShoppingCart size={13} aria-hidden="true" />
            <span>{buyBusy ? 'Adding…' : buyLabel}</span>
          </button>
        )}
        <motion.div
          initial={false}
          whileHover={reduce ? undefined : { scale: 1.04 }}
          transition={{
            duration: reduce ? 0 : 0.5,
            ease: [0.32, 0.72, 0, 1],
          }}
        >
          {productImage ? (
            <OptimizedImage
              src={productImage}
              alt={`${product.name} — Product cover`}
              fill
              aspectRatio="4/5"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="rounded-md"
            />
          ) : (
            (() => {
              const tone = pickTone(product.id)
              return (
                <div
                  aria-hidden
                  className={cn(
                    'relative flex aspect-[4/5] w-full flex-col justify-between rounded-md p-5 md:p-6',
                    tone.bg,
                  )}
                >
                  <span
                    className={cn(
                      'font-display text-[40px] font-light leading-none md:text-[56px]',
                      tone.mark,
                    )}
                  >
                    {(creatorName?.[0] ?? product.name[0] ?? '·').toUpperCase()}
                  </span>
                  <p
                    className={cn(
                      'font-display text-[15px] font-medium leading-tight md:text-[16px]',
                      tone.mark,
                    )}
                  >
                    {product.name}
                  </p>
                </div>
              )
            })()
          )}
        </motion.div>
      </div>

      {/* Product info */}
      <div className="mt-4 flex flex-col gap-1">
        {/* Subscription marker — editorial eyebrow, not a neon pill overlay
            (anti-slop). Lets buyers tell a recurring tier from a one-off. */}
        {product.is_recurring && (
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            Subscription
          </p>
        )}
        <h3
          className={cn(
            typography.h4,
            'line-clamp-2 text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)]',
          )}
        >
          {product.name}
        </h3>
        {!hideCreator && creatorName && (
          <p className={cn(typography.small, 'text-[var(--text-muted)]')}>
            by {creatorName}
          </p>
        )}
        {(() => {
          // Compact rating + sales row per blyss-design (no 5-star graphic):
          // "4.8 · 32 reviews · 18 sold". Reads the per-listing card stats
          // populated by /v1/products/public (review_count,
          // review_rating_avg, orders_count). Each fragment is shown
          // only when its value is meaningful — a fresh product never
          // reads "0 sold · 0 reviews".
          //
          // Also tolerates the legacy `review_summary` shape that some
          // older fetches still populate, so this card works on both
          // /v1/products/public (new shape) and any internal feed that
          // still attaches the old object.
          const p = product as unknown as {
            review_count?: number
            review_rating_avg?: number | null
            orders_count?: number
            review_summary?: {
              average_rating: number
              total_reviews: number
            } | null
          }
          const reviewCount = p.review_count ?? p.review_summary?.total_reviews ?? 0
          const reviewAvg =
            p.review_rating_avg ?? p.review_summary?.average_rating ?? null
          const ordersCount = p.orders_count ?? 0
          const fragments: React.ReactNode[] = []
          if (reviewCount > 0 && reviewAvg !== null) {
            fragments.push(
              <span key="rating" className="flex items-center gap-1">
                <FiStar
                  size={13}
                  className="fill-[var(--accent)] text-[var(--accent)]"
                />
                <span className="font-medium tabular-nums">
                  {reviewAvg.toFixed(1)}
                </span>
                <span className="text-[var(--text-muted)]">
                  ({reviewCount})
                </span>
              </span>,
            )
          }
          if (ordersCount > 0) {
            fragments.push(
              <span key="sold" className="text-[var(--text-secondary)]">
                {formatCount(ordersCount)} sold
              </span>,
            )
          }
          if (fragments.length === 0) return null
          return (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-[13px] text-[var(--text-secondary)]">
              {fragments.map((f, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="text-[var(--text-muted)]">·</span>}
                  {f}
                </React.Fragment>
              ))}
            </p>
          )
        })()}
        <p
          className={cn(
            'mt-1 font-display text-[18px] font-semibold tabular-nums text-[var(--text-primary)]',
          )}
        >
          {formatPrice(product, displayCurrency)}
          {product.is_recurring && (
            <span className="ml-1 font-sans text-[13px] font-normal text-[var(--text-muted)]">
              {recurringCadence(product)}
            </span>
          )}
        </p>
      </div>
    </Link>
  )
}
