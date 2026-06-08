'use client'

import Spinner from '@/components/Shared/Spinner'
import { ErrorState } from '@/components/Shared/ErrorState'
import {
  useCartGrouped,
  useCheckoutCartForOrganization,
} from '@/hooks/queries/cart'
import { useCurrencyStore } from '@/stores/currencyStore'
import { formatCurrency } from '@/lib/currency'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/auth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Avatar from '@/components/atoms/Avatar'
import { CartItem } from './CartItem'
import { EmptyCart } from './EmptyCart'

/**
 * /cart — full-page marketplace cart.
 *
 * Multi-creator marketplace: each creator the buyer has open items
 * with gets its own section, with subtotal + tax + total + a "Pay
 * {Creator}" button. Creators are listed independently — no combined
 * total, no "pay all" button. Polar's transactional model is per-org;
 * we never combine creators in a single charge.
 *
 * The buyer may pay one creator now and another later. After a
 * successful checkout, that creator's section disappears (cart cleared
 * server-side); the others remain.
 */
export const CartPage = () => {
  const { authenticated } = useAuth()
  const { data: cart, isLoading, error, refetch } = useCartGrouped(authenticated)
  const { currency } = useCurrencyStore()
  const router = useRouter()
  const { mutate: checkoutForOrg, isPending: isCheckingOut, variables: payingOrg } =
    useCheckoutCartForOrganization()

  const handleCheckout = (organizationId: string) => {
    checkoutForOrg(organizationId, {
      onSuccess: ({ url }) => router.push(url),
    })
  }

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-12"
        role="status"
        aria-live="polite"
        aria-label="Loading cart"
      >
        <Spinner />
        <span className="sr-only">Loading your shopping cart...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="font-display mb-8 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
          Your purchases
        </h1>
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

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Cart · {cart?.item_count ?? 0}{' '}
            {cart?.item_count === 1 ? 'item' : 'items'}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            Your purchases
          </h1>
          <p className="mt-3 max-w-prose font-sans text-[14px] text-[var(--text-secondary)]">
            Each creator you have items from is shown separately. Pay
            them one at a time — there&rsquo;s no combined checkout.
          </p>
        </div>
        <Link href="/">
          <Button variant="ghost" size="sm">
            Continue shopping
          </Button>
        </Link>
      </header>

      <div className="space-y-8">
        {groups.map((group) => (
          <section
            key={group.organization.id}
            aria-label={`Cart for ${group.organization.name}`}
            className="rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] p-6"
          >
            <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
              <Avatar
                className="h-9 w-9"
                avatar_url={group.organization.avatar_url}
                name={group.organization.name}
              />
              <div className="flex flex-1 items-baseline justify-between gap-4">
                <h2 className="font-display text-[18px] font-semibold tracking-tight text-[var(--text-primary)]">
                  {group.organization.name}
                </h2>
                <Link
                  href={`/${group.organization.slug}`}
                  className="font-sans text-[12px] text-[var(--text-muted)] underline-offset-4 transition-colors hover:text-[var(--accent)] hover:underline"
                >
                  View store
                </Link>
              </div>
            </div>

            <div className="divide-y divide-[var(--border)]">
              {group.items.map((item: any) => (
                <CartItem key={item.id} item={item} currency={currency} />
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-8 font-sans text-[13px]">
                  <span className="text-[var(--text-secondary)]">Subtotal</span>
                  <span className="tabular-nums text-[var(--text-primary)]">
                    {formatCurrency('compact')(group.subtotal, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-8 font-sans text-[13px]">
                  <span className="text-[var(--text-secondary)]">Tax</span>
                  <span className="tabular-nums text-[var(--text-primary)]">
                    {formatCurrency('compact')(group.tax, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-8 pt-1 font-display text-[15px] font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">
                    {formatCurrency('compact')(group.total, currency)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCheckout(group.organization.id)}
                disabled={isCheckingOut}
                className="inline-flex h-12 items-center justify-center rounded-md bg-[var(--accent)] px-6 font-sans text-[15px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCheckingOut && payingOrg === group.organization.id
                  ? 'Starting checkout…'
                  : `Pay ${group.organization.name}`}
              </button>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
