import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getServerURL } from '@/utils/api'
import { OrdersAggregator } from './OrdersAggregator'

export const metadata: Metadata = {
  title: 'Your orders · Blyss',
  description: 'Every product you bought on Blyss, across creators.',
  robots: { index: false, follow: false },
}

/**
 * /orders — buyer's flat orders list aggregated across creators.
 *
 * NOT a portal. Polar's per-creator portal at /{org-slug}/portal handles
 * downloads, benefits, refunds, subscription cancellation. This page is
 * a read-only "where did I spend money" surface that LINKS into each
 * creator's portal for the actual management actions.
 *
 * Hits /v1/me/orders (WebUser-auth, aggregates by case-insensitive
 * email match across every Customer row the buyer owns).
 */
export default async function Page() {
  const cookie = (await headers()).get('cookie') || ''
  if (!cookie.includes('polar_session=')) {
    redirect('/login?return_to=/orders')
  }

  const res = await fetch(`${getServerURL()}/v1/me/orders?limit=100`, {
    headers: { cookie },
    cache: 'no-store',
  })

  if (!res.ok) {
    if (res.status === 401) redirect('/login?return_to=/orders')
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
          Your orders
        </h1>
        <p className="mt-4 text-[var(--text-muted)]">
          Couldn&apos;t load your orders. Please try again later.
        </p>
      </div>
    )
  }

  const data = await res.json()
  const orders = data.items ?? []

  return <OrdersAggregator orders={orders} />
}
