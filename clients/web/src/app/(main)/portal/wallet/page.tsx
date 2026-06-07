import { getServerSideAPI } from '@/utils/client/serverside'
import { schemas } from '@/lib/api'
import type { Metadata } from 'next'
import WalletPage from './WalletPage'

export const metadata: Metadata = {
  title: 'Wallet · Blyss',
  description: 'Wallet balances per creator.',
  robots: { index: false, follow: false },
}

/**
 * Marketplace wallet page.
 *
 * Wallets are inherently per-org (a Polar wallet is a buyer's prepaid
 * balance with one creator) so we list them, one section per creator,
 * each with the existing CustomerPortalWallet rendered with that
 * creator's minted token.
 */
export default async function Page() {
  const api = await getServerSideAPI()

  const { data: wallets, error } = await api.GET(
    '/v1/me/wallets' as any,
    {
      params: { query: { limit: 100 } },
      cache: 'no-cache',
      next: { tags: ['customer_portal'] },
    } as any,
  )
  if (error) throw error

  const list = (wallets as schemas['ListResource_CustomerWallet_'])
    ?.items ?? []

  const sections: {
    organization: schemas['CustomerOrganization']
    wallet: schemas['CustomerWallet']
    customerSessionToken: string
  }[] = []
  for (const w of list) {
    const org = (w as any).customer?.organization as
      | schemas['CustomerOrganization']
      | undefined
    if (!org) continue
    const { data: tok } = await api.POST(
      '/v1/me/customer-session' as any,
      { body: { organization_id: org.id } } as any,
    )
    sections.push({
      organization: org,
      wallet: w,
      customerSessionToken: (tok as any)?.token ?? '',
    })
  }

  return <WalletPage sections={sections} />
}
