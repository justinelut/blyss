import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Settings · Blyss',
  robots: { index: false, follow: false },
}

/**
 * Marketplace settings stub.
 *
 * Customer-level settings (billing address, payment methods, OAuth-
 * linked accounts) are stored on the per-creator Customer row. There
 * is no canonical "marketplace customer" — the same buyer has a
 * separate customer row per creator they've bought from. Showing a
 * marketplace-level Settings page would falsely imply unified state.
 *
 * For now this surface points buyers back at the per-creator portal,
 * where the Settings page works against the existing
 * /v1/customer-portal/customers/me/* mutations.
 */
export default function Page() {
  return (
    <div className="flex flex-col gap-y-4">
      <h3 className="text-xl">Settings</h3>
      <p className="dark:text-polar-500 text-gray-500">
        Billing details and payment methods are stored per-creator. To
        update them, open a creator&apos;s portal from one of their
        orders.
      </p>
      <Link
        href="/portal/orders"
        className="text-sm font-medium text-[var(--accent)] hover:underline"
      >
        Go to your orders →
      </Link>
    </div>
  )
}
