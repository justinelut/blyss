import { getServerSideAPI } from '@/utils/client/serverside'
import { DataTableSearchParams, parseSearchParams } from '@/utils/datatable'
import { getOrganizationBySlugOrNotFound } from '@/utils/organization'
import { Metadata } from 'next'
import IncomePage from './IncomePage'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Finance - Income`, // " | Polar is added by the template"
  }
}

export default async function Page(props: {
  searchParams: Promise<DataTableSearchParams>
  params: Promise<{ organization: string }>
}) {
  const params = await props.params
  const searchParams = await props.searchParams
  const api = await getServerSideAPI()
  // Bypass the 10 min ISR cache: the income page reads
  // subaccount_status to render the 'Set up payouts' banner. Stale
  // cache made the banner persist after the user activated payouts.
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
    <IncomePage
      pagination={pagination}
      sorting={sorting}
      organization={organization}
    />
  )
}
