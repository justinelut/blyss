import { getServerSideAPI } from '@/utils/client/serverside'
import { schemas } from '@/lib/api'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import SubscriptionsPage from './SubscriptionsPage'

export const metadata: Metadata = {
  title: 'Subscription · Blyss',
  robots: { index: false, follow: false },
}

export default async function Page(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const api = await getServerSideAPI()

  const { data: subscription, error, response } = await api.GET(
    '/v1/me/subscriptions/{id}' as any,
    { params: { path: { id } } } as any,
  )

  if (response.status === 404) notFound()
  if (error) throw error

  const sub = subscription as schemas['CustomerSubscription']
  const orgId = (sub as any).customer?.organization?.id as string | undefined
  if (!orgId) notFound()

  const { data: tok } = await api.POST(
    '/v1/me/customer-session' as any,
    { body: { organization_id: orgId } } as any,
  )

  return (
    <SubscriptionsPage
      subscription={sub}
      customerSessionToken={(tok as any)?.token ?? ''}
    />
  )
}
