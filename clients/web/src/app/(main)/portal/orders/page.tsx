import { getServerSideAPI } from '@/utils/client/serverside'
import { schemas } from '@/lib/api'
import type { Metadata } from 'next'
import OrdersPage from './OrdersPage'

export const metadata: Metadata = {
  title: 'Orders · Blyss',
  description: 'Every product you bought on Blyss, across creators.',
  robots: { index: false, follow: false },
}

/**
 * Marketplace-level orders list.
 *
 * Hits /v1/me/orders (WebUser-auth, aggregated across creators) and
 * groups by creator client-side. For each creator section we mint a
 * customer-session-token via /v1/me/customer-session so the existing
 * CustomerPortalOrders component (which expects a token + org) renders
 * with full functionality — View Order modal, Manage links into the
 * per-creator portal, etc — all reusing the same component the per-org
 * portal uses. Zero new UI design.
 */
export default async function Page() {
  const api = await getServerSideAPI()

  const { data: orders, error } = await api.GET(
    '/v1/me/orders' as any,
    {
      params: { query: { limit: 100 } },
      cache: 'no-cache',
      next: { tags: ['customer_portal'] },
    } as any,
  )

  if (error) throw error

  // Group orders by organization. Each order's customer.organization
  // carries the CustomerOrganization shape the existing
  // CustomerPortalOrders component expects, so we just bucket them.
  const list = (orders as schemas['ListResource_CustomerOrder_'])
    ?.items ?? []
  const buckets = new Map<
    string,
    {
      organization: schemas['CustomerOrganization']
      orders: schemas['CustomerOrder'][]
    }
  >()
  for (const o of list) {
    const org = (o as any).customer?.organization as
      | schemas['CustomerOrganization']
      | undefined
    if (!org) continue
    const existing = buckets.get(org.id)
    if (existing) existing.orders.push(o)
    else buckets.set(org.id, { organization: org, orders: [o] })
  }

  // Mint a customer-session-token per creator so the View-Order
  // modal + Manage links keep working through the per-creator
  // /v1/customer-portal/* surface (same component, same auth path,
  // just minted server-side here for the auth'd user).
  const sections: {
    organization: schemas['CustomerOrganization']
    orders: schemas['CustomerOrder'][]
    customerSessionToken: string
  }[] = []
  for (const { organization, orders: rows } of buckets.values()) {
    const { data: tok } = await api.POST(
      '/v1/me/customer-session' as any,
      {
        body: { organization_id: organization.id },
      } as any,
    )
    sections.push({
      organization,
      orders: rows,
      customerSessionToken: (tok as any)?.token ?? '',
    })
  }

  return <OrdersPage sections={sections} />
}
