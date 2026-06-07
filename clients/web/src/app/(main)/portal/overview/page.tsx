import { getServerSideAPI } from '@/utils/client/serverside'
import { schemas } from '@/lib/api'
import type { Metadata } from 'next'
import OverviewPage from './OverviewPage'

export const metadata: Metadata = {
  title: 'Customer Portal · Blyss',
  description: 'Your purchases on Blyss across creators.',
  robots: { index: false, follow: false },
}

const cacheConfig = {
  cache: 'no-store' as RequestCache,
  next: { tags: ['customer_portal'] },
}

/**
 * Marketplace customer portal overview.
 *
 * Reuses CustomerPortalOverview component, rendered once per creator
 * the buyer has subscriptions with. Each section shows that creator's
 * subscriptions + a token minted for ongoing actions (cancel, change
 * plan).
 */
export default async function Page() {
  const api = await getServerSideAPI()

  const { data: subscriptions, error } = await api.GET(
    '/v1/me/subscriptions' as any,
    {
      params: { query: { limit: 100 } },
      ...cacheConfig,
    } as any,
  )
  if (error) throw error

  const list = (subscriptions as schemas['ListResource_CustomerSubscription_'])
    ?.items ?? []

  // Group by creator
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

  // Mint tokens per creator section so embedded actions work.
  const sections: {
    organization: schemas['CustomerOrganization']
    subscriptions: schemas['CustomerSubscription'][]
    customerSessionToken: string
  }[] = []
  for (const { organization, subscriptions: subs } of buckets.values()) {
    const { data: tok } = await api.POST(
      '/v1/me/customer-session' as any,
      { body: { organization_id: organization.id } } as any,
    )
    sections.push({
      organization,
      subscriptions: subs,
      customerSessionToken: (tok as any)?.token ?? '',
    })
  }

  return <OverviewPage sections={sections} />
}
