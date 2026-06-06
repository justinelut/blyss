'use client'

/* Hallmark · macrostructure: Tabular Spec Sheet · genre: editorial
 * theme: blyss-design (light cream + burnt orange #C2410C accent)
 * sections: Cart head · Item rows (line items) · Sticky summary panel ·
 *           Checkout CTA · Auth-gate empty state
 * nav: N9 (inherited) · footer: Ft1 (inherited)
 * contrast: pass · slop: pass (gates 1, 2, 7, 8, 36, 51–55, 67)
 *
 * Reference DNA: ALD product page line items + SSENSE bag — tabular numerals,
 * hairline rules between rows, sticky right-column summary, full-width
 * checkout CTA.
 */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import {
  useCart,
  useCheckoutCart,
  useRemoveFromCart,
} from '@/hooks/queries/cart'
import { useAddToWishlist } from '@/hooks/queries/wishlist'
import { useAuth } from '@/hooks/auth'
import { CartItemRow } from './CartItemRow'
import { CategoryNavigation } from '@/components/Category/CategoryNavigation'
import { Skeleton, Eyebrow, typography } from '@/design'
import { cn } from '@/lib/utils'

const fmtPrice = (cents: number, currency = 'KES') => {
  const major = cents / 100
  // Unambiguous currency labels: KES → "KSh", USD → "US$" (not bare "$"),
  // others ISO-prefixed. Keeps parity with MarketplaceProductCard +
  // ProductInfoColumn so the label discipline is consistent.
  if (currency === 'KES') return `KSh ${major.toLocaleString('en-KE')}`
  if (currency === 'USD') return `US$ ${major.toLocaleString('en-US')}`
  return `${currency} ${major.toLocaleString()}`
}

/**
 * BlyssCartPage — full page, two-column layout with sticky summary.
 * Per plan §6.6.
 */
export const BlyssCartPage = () => {
  const router = useRouter()
  const { authenticated } = useAuth()
  const { data: cart, isLoading } = useCart(authenticated)
  const { mutate: removeItem, variables: removingId } = useRemoveFromCart()
  const { mutate: addToWishlist, variables: savingProductId, isPending: isSaving } =
    useAddToWishlist()
  const { mutate: checkoutCart, isPending: isCheckingOut } = useCheckoutCart()

  const items = (cart as any)?.items ?? []
  const subtotal = (cart as any)?.subtotal ?? 0
  const tax = (cart as any)?.tax ?? 0
  const total = (cart as any)?.total ?? 0

  if (!authenticated) {
    return (
      <div className="mx-auto max-w-[1280px] px-6 py-16 md:px-16 md:py-24">
        <h1 className={cn(typography.h2, 'text-[var(--text-primary)]')}>
          Your cart
        </h1>
        <div className="mt-12 max-w-[44ch]">
          <h2 className={cn(typography.h3, 'text-[var(--text-primary)]')}>
            Sign in to view your cart.
          </h2>
          <p
            className={cn(typography.body, 'mt-4 text-[var(--text-secondary)]')}
          >
            Your cart is tied to your Blyss account. Sign in to add items and
            check out with card or mobile money.
          </p>
          <Link
            href={`/login?return_to=${encodeURIComponent('/cart')}`}
            className="mt-8 inline-flex h-11 items-center justify-center rounded-md bg-[var(--accent)] px-6 font-sans text-[14px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1280px] px-6 py-12 md:px-16">
        <Skeleton className="mb-8 h-10 w-48" />
        <div className="flex flex-col gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-[100px] w-[80px]" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="mx-auto max-w-[1280px] px-6 py-16 md:px-16 md:py-24">
        <h1 className={cn(typography.h2, 'text-[var(--text-primary)]')}>
          Your cart
        </h1>
        <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
          <div className="max-w-[52ch]">
            <h2 className={cn(typography.h3, 'text-[var(--text-primary)]')}>
              Nothing in your cart yet.
            </h2>
            <p
              className={cn(typography.body, 'mt-4 text-[var(--text-secondary)]')}
            >
              Save the things you love. We'll keep them here so you can come
              back when you're ready to check out.
            </p>
            <Link
              href="/marketplace"
              className="mt-8 inline-flex h-11 items-center justify-center rounded-md bg-[var(--accent)] px-6 font-sans text-[14px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
            >
              Browse the marketplace
            </Link>
          </div>
          {/* Etsy-style continue-exploring panel — typographic category list,
              hairline rules between rows. Uses CategoryNavigation under the
              hood (already palette-clean, locale-aware). */}
          <aside className="border-t border-[var(--border)] pt-8 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              Continue exploring
            </p>
            <div className="mt-5">
              <CategoryNavigation variant="vertical" />
            </div>
          </aside>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-12 md:px-16 md:py-16">
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={cn(typography.h2, 'mb-10 text-[var(--text-primary)]')}
      >
        Your cart
      </motion.h1>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_360px] lg:gap-16">
        {/* Items column */}
        <div className="divide-y divide-[var(--border)]">
          <AnimatePresence initial={false}>
            {items.map((item: any) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <CartItemRow
                  item={item}
                  onRemove={(id) => removeItem({ itemId: id })}
                  isRemoving={(removingId as any)?.itemId === item.id}
                  onSaveForLater={(it) => {
                    // Optimistic Etsy-style 'Save for later':
                    // 1) push the product to the wishlist
                    // 2) on success, drop the item from the cart
                    addToWishlist(it.product.id, {
                      onSuccess: () => removeItem({ itemId: it.id }),
                    })
                  }}
                  isSaving={savingProductId === item.product.id && isSaving}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Summary — sticky on desktop */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-md bg-[var(--surface-sunken)] p-6">
            <Eyebrow>Order summary</Eyebrow>
            <div className="mt-6 flex flex-col gap-3 font-sans text-[14px]">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Subtotal</span>
                <span className="font-medium tabular-nums text-[var(--text-primary)]">
                  {fmtPrice(subtotal)}
                </span>
              </div>
              {tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Tax</span>
                  <span className="font-medium tabular-nums text-[var(--text-primary)]">
                    {fmtPrice(tax)}
                  </span>
                </div>
              )}
              <div className="mt-3 border-t border-[var(--border)] pt-3">
                <div className="flex justify-between">
                  <span className="font-display text-[16px] font-semibold text-[var(--text-primary)]">
                    Total
                  </span>
                  <span className="font-display text-[20px] font-semibold tabular-nums text-[var(--text-primary)]">
                    {fmtPrice(total)}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                checkoutCart(undefined, {
                  onSuccess: ({ url }) => router.push(url),
                })
              }}
              disabled={isCheckingOut}
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-md bg-[var(--accent)] font-sans text-[15px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCheckingOut ? 'Starting checkout...' : 'Checkout'}
            </button>

            {/* Reassurance — Etsy-style trust copy under the CTA. Real
                affordances only, no invented metrics or trust badges
                (gates 56 + no-trust-strips). */}
            <ul className="mt-5 flex flex-col gap-2 font-sans text-[12px] text-[var(--text-muted)]">
              <li className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-1 w-1 rounded-full bg-[var(--accent)]"
                />
                Pay with card or M-Pesa
              </li>
              <li className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-1 w-1 rounded-full bg-[var(--accent)]"
                />
                Receipt to your inbox · instant delivery
              </li>
              <li className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-1 w-1 rounded-full bg-[var(--accent)]"
                />
                Every purchase pays the creator directly
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
