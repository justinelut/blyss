import { getServerSideAPI } from '@/utils/client/serverside'
import { getOrganizationBySlugOrNotFound } from '@/utils/organization'
import { Metadata } from 'next'
import AccountPage from './AccountPage'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Finance - Payout Account`, // " | Polar is added by the template"
  }
}

export default async function Page(props: {
  params: Promise<{ organization: string }>
}) {
  const params = await props.params
  const api = await getServerSideAPI()
  // Bypass the 10 min ISR cache: the finance/account surface reads
  // mutable per-user state (subaccount_status, mpesa_verified). After
  // the user activates payouts, window.location.reload() must surface
  // the fresh state, not a stale 'Not configured' from before
  // activation.
  const organization = await getOrganizationBySlugOrNotFound(
    api,
    params.organization,
    true,
  )

  return <AccountPage organization={organization} />
}
