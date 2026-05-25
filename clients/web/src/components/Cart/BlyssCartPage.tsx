'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart, useRemoveFromCart } from '@/hooks/queries/cart'
import { CartItemRow } from './CartItemRow'
import { Skeleton, Eyebrow, typography } from '@/design'
import { cn } from '@/lib/utils'

const fmtPrice = (cents: number, currency = 'KES') => {
  const major = cents / 100
  if (currency === 'KES') return `KSh ${major.toLocaleString('en-KE')}`
  if (currency === 'USD') return `$${major.toLocaleString('en-US')}`
  return `${major.toLocaleString()} ${currency}`
}

/**
 * BlyssCartPage — full page, two-column layout with sticky summary.
 * Per plan §6.6.
 */
export const BlyssCartPage = () => {
  const router = useRouter()
  const { data: cart, isLoading } = useCart()
  const { mutate: removeItem, variables: removingId } = useRemoveFromCart()

  const items = (cart as any)?.items ?? []
  const subtotal = (cart as any)?.subtotal ?? 0
  const tax = (cart as any)?.tax ?? 0
  const total = (cart as any)?.total ?? 0

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
        <h1 className={cn(typography.h2, 'text-[var(--text-primary)]')}>Your cart</h1>
        <div className="mt-12 max-w-[44ch]">
          <h2 className={cn(typography.h3, 'text-[var(--text-primary)]')}>Nothing here yet.</h2>
          <p className={cn(typography.body, 'mt-4 text-[var(--text-secondary)]')}>
            Browse the marketplace and find something worth your while.
          </p>
          <Link
            href="/marketplace"
            className="mt-8 inline-flex h-11 items-center justify-center rounded-md bg-[var(--accent)] px-6 font-sans text-[14px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            Browse
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-12 md:px-16 md:py-16">
      <h1 className={cn(typography.h2, 'mb-10 text-[var(--text-primary)]')}>Your cart</h1>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_360px] lg:gap-16">
        {/* Items column */}
        <div className="divide-y divide-[var(--border)]">
          {items.map((item: any) => (
            <CartItemRow
              key={item.id}
              item={item}
              onRemove={(id) => removeItem({ itemId: id })}
              isRemoving={(removingId as any)?.itemId === item.id}
            />
          ))}
        </div>

        {/* Summary — sticky on desktop */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-md bg-[var(--surface-sunken)] p-6">
            <Eyebrow>Order summary</Eyebrow>
            <div className="mt-6 flex flex-col gap-3 font-sans text-[14px]">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Subtotal</span>
                <span className="font-medium tabular-nums text-[var(--text-primary)]">{fmtPrice(subtotal)}</span>
              </div>
              {tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Tax</span>
                  <span className="font-medium tabular-nums text-[var(--text-primary)]">{fmtPrice(tax)}</span>
                </div>
              )}
              <div className="mt-3 border-t border-[var(--border)] pt-3">
                <div className="flex justify-between">
                  <span className="font-display text-[16px] font-semibold text-[var(--text-primary)]">Total</span>
                  <span className="font-display text-[20px] font-semibold tabular-nums text-[var(--text-primary)]">{fmtPrice(total)}</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push('/checkout')}
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-md bg-[var(--accent)] font-sans text-[15px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
            >
              Checkout
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
