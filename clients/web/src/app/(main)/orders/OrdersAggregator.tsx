'use client'

import Link from 'next/link'
import Avatar from '@/components/atoms/Avatar'
import FormattedDateTime from '@/components/atoms/FormattedDateTime'
import { OrderStatus } from '@/components/Orders/OrderStatus'
import Button from '@/components/atoms/Button'
import { FiArrowUpRight, FiShoppingBag } from 'react-icons/fi'

interface OrdersAggregatorProps {
  orders: any[]
}

const fmtPrice = (cents: number, currency: string) => {
  const major = cents / 100
  if (currency === 'KES' || currency === 'kes')
    return `KSh ${major.toLocaleString('en-KE')}`
  if (currency === 'USD' || currency === 'usd')
    return `US$ ${major.toLocaleString('en-US')}`
  return `${currency.toUpperCase()} ${major.toLocaleString()}`
}

/**
 * Read-only orders list aggregated across all creators the buyer
 * has bought from. Each order row links out to the creator's
 * per-creator portal for the actual management actions
 * (download, benefits, refund) — that's Polar's native surface.
 */
export const OrdersAggregator = ({ orders }: OrdersAggregatorProps) => {
  // Group by creator org for visual cohesion (one creator's orders
  // listed together) but each row is still its own deep-link.
  const buckets = new Map<
    string,
    {
      organization: { id: string; slug: string; name: string; avatar_url?: string | null }
      orders: any[]
    }
  >()
  for (const o of orders) {
    const org = o.customer?.organization
    if (!org) continue
    const existing = buckets.get(org.id)
    if (existing) existing.orders.push(o)
    else buckets.set(org.id, { organization: org, orders: [o] })
  }

  if (buckets.size === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <header className="mb-10">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Your orders
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            Nothing here yet.
          </h1>
          <p className="mt-3 max-w-prose text-[var(--text-secondary)]">
            Your purchases will appear here once you buy something.
          </p>
        </header>
        <Link href="/">
          <Button>Browse marketplace</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <header className="mb-10 flex items-baseline justify-between">
        <div>
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Your orders · {orders.length}{' '}
            {orders.length === 1 ? 'order' : 'orders'}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            Every purchase on Blyss
          </h1>
          <p className="mt-3 max-w-prose text-[var(--text-secondary)]">
            Open the creator&rsquo;s portal to download your files, manage
            subscriptions, or request a refund.
          </p>
        </div>
      </header>

      <div className="space-y-8">
        {Array.from(buckets.values()).map(
          ({ organization, orders: rows }) => (
            <section
              key={organization.id}
              className="rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] p-6"
            >
              <div className="mb-4 flex items-center gap-3 border-b border-[var(--border)] pb-4">
                <Avatar
                  className="h-9 w-9"
                  avatar_url={organization.avatar_url}
                  name={organization.name}
                />
                <div className="flex flex-1 items-baseline justify-between gap-4">
                  <h2 className="font-display text-[18px] font-semibold tracking-tight text-[var(--text-primary)]">
                    {organization.name}
                  </h2>
                  <Link
                    href={`/${organization.slug}/portal/orders`}
                    className="inline-flex items-center gap-1 font-sans text-[12px] text-[var(--text-muted)] underline-offset-4 transition-colors hover:text-[var(--accent)] hover:underline"
                  >
                    Open creator portal
                    <FiArrowUpRight size={12} aria-hidden="true" />
                  </Link>
                </div>
              </div>

              <ul className="divide-y divide-[var(--border)]">
                {rows.map((order) => (
                  <li
                    key={order.id}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-sans text-[14px] font-medium text-[var(--text-primary)]">
                        {order.product?.name ??
                          order.description ??
                          'Purchase'}
                      </p>
                      <div className="mt-1 flex items-center gap-3 font-sans text-[12px] text-[var(--text-secondary)]">
                        <FormattedDateTime
                          datetime={order.created_at}
                          dateStyle="medium"
                          resolution="day"
                        />
                        <span aria-hidden>·</span>
                        <span className="tabular-nums">
                          {fmtPrice(
                            order.total_amount ?? order.amount ?? 0,
                            order.currency ?? 'KES',
                          )}
                        </span>
                        <span aria-hidden>·</span>
                        <OrderStatus status={order.status} />
                      </div>
                    </div>
                    <Link
                      href={`/${organization.slug}/portal/orders/${order.id}`}
                    >
                      <Button variant="secondary" size="sm">
                        <FiShoppingBag
                          size={12}
                          className="mr-1.5"
                          aria-hidden="true"
                        />
                        View
                      </Button>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ),
        )}
      </div>
    </div>
  )
}
