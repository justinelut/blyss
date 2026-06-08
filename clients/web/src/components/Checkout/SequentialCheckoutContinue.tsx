'use client'

import { FiShoppingBag, FiArrowRight } from 'react-icons/fi'
import Link from 'next/link'
import {
  useCartGrouped,
  useCheckoutCartForOrganization,
} from '@/hooks/queries/cart'
import { useAuth } from '@/hooks/auth'
import { useRouter } from 'next/navigation'

interface SequentialCheckoutContinueProps {
  /** Organization id whose checkout was just completed — that
   *  creator's section is HIDDEN from the prompt below. */
  justCompletedOrganizationId?: string
}

const fmtPrice = (cents: number) =>
  `KSh ${(cents / 100).toLocaleString('en-KE')}`

/**
 * After a buyer completes one creator's checkout, surface the
 * other creators they have items pending with so they can continue
 * paying sequentially. Never forces the buyer to continue — they can
 * close the page and the other carts wait indefinitely.
 *
 * Quietly renders nothing when the buyer has no other carts pending.
 */
export const SequentialCheckoutContinue = ({
  justCompletedOrganizationId,
}: SequentialCheckoutContinueProps) => {
  const router = useRouter()
  const { authenticated } = useAuth()
  const { data: cart } = useCartGrouped(authenticated)
  const { mutate: checkoutForOrg, isPending, variables: payingOrg } =
    useCheckoutCartForOrganization()

  const remaining = (cart?.groups ?? []).filter(
    (g) =>
      g.organization.id !== justCompletedOrganizationId && g.item_count > 0,
  )

  if (remaining.length === 0) return null

  const handlePay = (organizationId: string) => {
    checkoutForOrg(organizationId, {
      onSuccess: ({ url }) => router.push(url),
    })
  }

  return (
    <section
      aria-labelledby="continue-purchases-heading"
      className="mt-8 rounded-md border border-[var(--border)] bg-[var(--surface)] p-6"
    >
      <header className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)]">
          <FiShoppingBag size={14} aria-hidden="true" />
        </span>
        <div>
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Continue your purchases
          </p>
          <h3
            id="continue-purchases-heading"
            className="font-display text-[18px] font-semibold tracking-tight text-[var(--text-primary)]"
          >
            You also have items from{' '}
            {remaining.length === 1
              ? '1 other creator'
              : `${remaining.length} other creators`}
          </h3>
        </div>
      </header>

      <ul className="mt-5 divide-y divide-[var(--border)]">
        {remaining.map((group) => (
          <li
            key={group.organization.id}
            className="flex items-center justify-between gap-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="font-sans text-[14px] font-medium text-[var(--text-primary)]">
                {group.organization.name}
              </p>
              <p className="font-sans text-[12px] tabular-nums text-[var(--text-secondary)]">
                {group.item_count} {group.item_count === 1 ? 'item' : 'items'}{' '}
                · {fmtPrice(group.subtotal)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handlePay(group.organization.id)}
              disabled={isPending}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--accent)] px-4 font-sans text-[13px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending && payingOrg === group.organization.id
                ? 'Starting…'
                : 'Pay now'}
              <FiArrowRight size={14} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      <Link
        href="/cart"
        className="mt-5 inline-flex items-center font-sans text-[13px] text-[var(--text-secondary)] underline-offset-4 transition-colors hover:text-[var(--accent)] hover:underline"
      >
        View all your purchases →
      </Link>
    </section>
  )
}
