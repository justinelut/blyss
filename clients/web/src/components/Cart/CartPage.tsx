'use client'

import Spinner from '@/components/Shared/Spinner'
import { ErrorState } from '@/components/Shared/ErrorState'
import {
  useCartGrouped,
  useCheckoutCartForOrganization,
  useRemoveFromCart,
} from '@/hooks/queries/cart'
import { useAddToWishlist } from '@/hooks/queries/wishlist'
import { useAuth } from '@/hooks/auth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Avatar from '@/components/atoms/Avatar'
import { CartItemRow } from './CartItemRow'
import { EmptyCart } from './EmptyCart'
import { FiArrowRight, FiArrowUpRight } from 'react-icons/fi'

/**
 * /cart — full marketplace cart, per-creator sections.
 *
 * Hallmark · component: cart-page · genre: editorial-utility
 * theme: blyss-design (light cream + burnt orange #C2410C accent)
 *
 * Reference DNA: Are.na list density + Aimé Leon Dore product chrome.
 * Editorial restraint — hairline borders, surface-tone shifts (no
 * shadows), Inter Display headlines with -0.02em tracking, Inter body
 * at 14px/1.6, currency in tabular-nums.
 *
 * Per-creator section repeats the drawer's section pattern but at
 * full-page width:
 *   - identity row: 40px avatar + creator name + 'View store' link
 *   - item rows: thumbnail + name + creator + price + actions
 *   - totals stack: subtotal · tax · total (display sm)
 *   - primary CTA: "Pay {Creator}" (filled accent, full row width
 *     on mobile, auto on desktop)
 *
 * No combined-pay button: Polar's transactional model is per-org,
 * every charge resolves to one creator's subaccount. Sequential
 * checkouts — pay one creator now, the rest stay in the cart for
 * later.
 */

const fmtPrice = (cents: number, currency = 'KES') => {
  const major = cents / 100
  if (currency === 'KES' || currency === 'kes')
    return `KSh ${major.toLocaleString('en-KE')}`
  if (currency === 'USD' || currency === 'usd')
    return `US$ ${major.toLocaleString('en-US')}`
  return `${currency.toUpperCase()} ${major.toLocaleString()}`
}

export const CartPage = () => {
  const { authenticated } = useAuth()
  const { data: cart, isLoading, error, refetch } = useCartGrouped(authenticated)
  const router = useRouter()
  const {
    mutate: checkoutForOrg,
    isPending: isCheckingOut,
    variables: payingOrg,
  } = useCheckoutCartForOrganization()
  const { mutate: removeItem, variables: removingId } = useRemoveFromCart()
  const {
    mutate: addToWishlist,
    variables: savingProductId,
    isPending: isSaving,
  } = useAddToWishlist()

  const handleCheckout = (organizationId: string) => {
    checkoutForOrg(organizationId, {
      onSuccess: ({ url }) => router.push(url),
    })
  }

  if (isLoading) {
    return (
      <div
        className="flex min-h-[40vh] items-center justify-center"
        role="status"
        aria-live="polite"
        aria-label="Loading cart"
      >
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 md:px-8">
        <header className="mb-10">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Cart
          </p>
          <h1 className="mt-2 font-display text-[clamp(28px,3.5vw,44px)] font-semibold leading-[1.05] tracking-[-0.02em] text-[var(--text-primary)]">
            Something went wrong.
          </h1>
        </header>
        <ErrorState
          title="Failed to load cart"
          message="We couldn't load your cart. Please try again."
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  const groups = cart?.groups ?? []

  if (groups.length === 0) {
    return <EmptyCart />
  }

  const currency = (groups[0]?.items?.[0] as any)?.product?.prices?.[0]
    ?.price_currency
    ? ((groups[0].items[0] as any).product.prices[0].price_currency as string)
        .toUpperCase()
    : 'KES'

  return (
    <div className="mx-auto max-w-[960px] px-6 py-12 md:px-8 md:py-16">
      {/* Editorial header */}
      <header className="mb-12">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Cart · {cart?.item_count ?? 0}{' '}
          {cart?.item_count === 1 ? 'item' : 'items'}
        </p>
        <h1 className="mt-2 font-display text-[clamp(32px,4vw,52px)] font-semibold leading-[1.05] tracking-[-0.02em] text-[var(--text-primary)]">
          Your purchases.
        </h1>
        <p className="mt-4 max-w-[52ch] font-sans text-[15px] leading-[1.55] text-[var(--text-secondary)]">
          Each creator&rsquo;s items are checked out separately — pay
          one now, come back for the others whenever. M-Pesa or card.
          Receipts and downloads land in each creator&rsquo;s portal,
          linked from your confirmation email.
        </p>
      </header>

      {/* Per-creator sections — separated by surface-tone breaks (not
          shadow cards) per the Blyss design system. */}
      <div className="space-y-px overflow-hidden rounded-md border border-[var(--border)] bg-[var(--background)]">
        {groups.map((group, idx) => (
          <section
            key={group.organization.id}
            aria-label={`Cart with ${group.organization.name}`}
            className="bg-[var(--background)]"
          >
            {/* Creator identity row */}
            <div className="flex items-center justify-between gap-4 bg-[var(--surface)] px-6 py-4 md:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar
                  className="h-9 w-9 shrink-0"
                  avatar_url={group.organization.avatar_url}
                  name={group.organization.name}
                />
                <div className="min-w-0">
                  <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    From
                  </p>
                  <h2 className="truncate font-display text-[18px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
                    {group.organization.name}
                  </h2>
                </div>
              </div>
              <Link
                href={`/${group.organization.slug}`}
                className="hidden items-center gap-1 font-sans text-[12px] font-medium text-[var(--text-muted)] underline-offset-4 transition-colors hover:text-[var(--accent)] hover:underline sm:inline-flex"
              >
                View store
                <FiArrowUpRight size={12} aria-hidden="true" />
              </Link>
            </div>

            {/* Items */}
            <div className="divide-y divide-[var(--border)] px-6 md:px-8">
              {group.items.map((item: any) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  onRemove={(id) => removeItem({ itemId: id })}
                  isRemoving={(removingId as any)?.itemId === item.id}
                  onSaveForLater={(it) => {
                    addToWishlist(it.product.id, {
                      onSuccess: () => removeItem({ itemId: it.id }),
                    })
                  }}
                  isSaving={savingProductId === item.product.id && isSaving}
                />
              ))}
            </div>

            {/* Totals + Pay CTA */}
            <div className="grid items-end gap-6 border-t border-[var(--border)] bg-[var(--surface)] px-6 py-5 md:grid-cols-[1fr_auto] md:px-8">
              <dl className="space-y-1.5 font-sans text-[14px]">
                <div className="flex items-center justify-between gap-12">
                  <dt className="text-[var(--text-secondary)]">Subtotal</dt>
                  <dd className="tabular-nums text-[var(--text-primary)]">
                    {fmtPrice(group.subtotal, currency)}
                  </dd>
                </div>
                {group.tax > 0 && (
                  <div className="flex items-center justify-between gap-12">
                    <dt className="text-[var(--text-secondary)]">Tax</dt>
                    <dd className="tabular-nums text-[var(--text-primary)]">
                      {fmtPrice(group.tax, currency)}
                    </dd>
                  </div>
                )}
                <div className="flex items-center justify-between gap-12 pt-1">
                  <dt className="font-display text-[15px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
                    Total
                  </dt>
                  <dd className="font-display text-[18px] font-semibold tabular-nums tracking-[-0.01em] text-[var(--text-primary)]">
                    {fmtPrice(group.total, currency)}
                  </dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => handleCheckout(group.organization.id)}
                disabled={isCheckingOut}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-7 font-sans text-[15px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCheckingOut && payingOrg === group.organization.id
                  ? 'Starting checkout…'
                  : `Pay ${group.organization.name}`}
                {!(isCheckingOut && payingOrg === group.organization.id) && (
                  <FiArrowRight size={14} aria-hidden="true" />
                )}
              </button>
            </div>

            {/* Hairline between sections (last group has none) */}
            {idx < groups.length - 1 && (
              <div className="h-px bg-[var(--border)]" aria-hidden="true" />
            )}
          </section>
        ))}
      </div>

      {/* Footer note — discreet, editorial */}
      <p className="mt-8 max-w-prose font-sans text-[12px] leading-[1.6] text-[var(--text-muted)]">
        Each payment goes directly to that creator via Blyss — your
        Money is on Paystack&rsquo;s rails, never on Blyss&rsquo;s
        balance sheet. Refund requests, downloads, and subscription
        management live on each creator&rsquo;s portal once payment
        clears.
      </p>
    </div>
  )
}
