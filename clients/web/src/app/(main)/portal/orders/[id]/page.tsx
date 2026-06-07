import { getServerSideAPI } from '@/utils/client/serverside'
import { schemas } from '@/lib/api'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import OrderPage from './OrdersPage'

export const metadata: Metadata = {
  title: 'Order · Blyss',
  robots: { index: false, follow: false },
}

/**
 * Order detail at the marketplace level.
 *
 * Hits /v1/me/orders/{id} (WebUser-auth, returns the same CustomerOrder
 * schema as /v1/customer-portal/orders/{id}) so the existing
 * CustomerPortalOrder component renders unchanged. We mint a customer-
 * session-token for the order's organization so the component's
 * downstream actions (download invoice, request refund) hit the
 * existing /v1/customer-portal/orders/{id}/* mutations with the
 * right auth.
 */
export default async function Page(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const api = await getServerSideAPI()

  const { data: order, error, response } = await api.GET(
    '/v1/me/orders/{id}' as any,
    { params: { path: { id } } } as any,
  )

  if (response.status === 404) notFound()
  if (error) throw error

  const customerOrder = order as schemas['CustomerOrder']
  const orgId = (customerOrder as any).customer?.organization?.id as
    | string
    | undefined
  if (!orgId) notFound()

  const { data: tok } = await api.POST(
    '/v1/me/customer-session' as any,
    { body: { organization_id: orgId } } as any,
  )

  return (
    <OrderPage
      order={customerOrder}
      customerSessionToken={(tok as any)?.token ?? ''}
    />
  )
}
