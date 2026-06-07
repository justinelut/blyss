import { getServerSideAPI } from '@/utils/client/serverside'
import { schemas } from '@/lib/api'
import type { Metadata } from 'next'
import SubscriptionsListPage from './SubscriptionsListPage'

export const metadata: Metadata = {
  title: 'Subscriptions · Blyss',
  description: 'Active recurring purchases across creators.',
  robots: { index: false, follow: false },
}

/**
 * Marketplace subscriptions list.
 *
 * Same group-by-creator pattern as /portal/orders. The original
 * per-org portal didn't have a subscription LIST page (only [id]) —
 * subs were rendered as cards inside CustomerPortalOverview. At
 * marketplace level we list them directly so buyers can scan
 * everything they have running.
 */
export default async function Page() {
  const api = await getServerSideAPI()

  const { data: subscriptions, error } = await api.GET(
    '/v1/me/subscriptions' as any,
    {
      params: { query: { limit: 100 } },
      cache: 'no-cache',
      next: { tags: ['customer_portal'] },
    } as any,
  )
  if (error) throw error

  const list = (subscriptions as schemas['ListResource_CustomerSubscription_'])
    ?.items ?? []

  // Group by creator like /portal/orders does
  const buckets = new Map<
    string,
    {
      organization: schemas['CustomerOrganization']
      subscriptions: schemas['CustomerSubscription'][]
    }
  >()
  for (const s of list) {
    const org = (s as any).customer?.organization as
      | schemas['CustomerOrganization']
      | undefined
    if (!org) continue
    const existing = buckets.get(org.id)
    if (existing) existing.subscriptions.push(s)
    else buckets.set(org.id, { organization: org, subscriptions: [s] })
  }

  // No token-mint needed for list display — clicking through to a
  // sub goes to /portal/subscriptions/{id} which mints its own token.
  const sections = Array.from(buckets.values())

  return <SubscriptionsListPage sections={sections} />
}
