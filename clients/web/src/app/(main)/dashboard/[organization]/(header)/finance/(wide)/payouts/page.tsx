import { getServerSideAPI } from '@/utils/client/serverside'
import { DataTableSearchParams, parseSearchParams } from '@/utils/datatable'
import { getOrganizationBySlugOrNotFound } from '@/utils/organization'
import { Metadata } from 'next'
import PayoutsPage from './PayoutsPage'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Finance - Payouts`, // " | Polar is added by the template"
  }
}

export default async function Page(props: {
  searchParams: Promise<DataTableSearchParams>
  params: Promise<{ organization: string }>
}) {
  const params = await props.params
  const searchParams = await props.searchParams
  const api = await getServerSideAPI()
  // Bypass the 10 min ISR cache so post-activation refresh shows the
  // current subaccount_status (income/payouts banners read it).
  const organization = await getOrganizationBySlugOrNotFound(
    api,
    params.organization,
    true,
  )

  const { pagination, sorting } = parseSearchParams(
    searchParams,
    [{ id: 'created_at', desc: true }],
    50,
  )

  return (
    <PayoutsPage
      pagination={pagination}
      sorting={sorting}
      organization={organization}
    />
  )
}
