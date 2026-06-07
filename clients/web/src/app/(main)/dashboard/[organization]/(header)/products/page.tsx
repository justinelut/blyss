import { getServerSideAPI } from '@/utils/client/serverside'
import { DataTableSearchParams, parseSearchParams } from '@/utils/datatable'
import { getOrganizationBySlugOrNotFound } from '@/utils/organization'
import { Metadata } from 'next'
import ProductsPage from './ProductsPage'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Products', // " | Polar is added by the template"
  }
}

export default async function Page(props: {
  params: Promise<{ organization: string }>
  searchParams: Promise<DataTableSearchParams & { query?: string }>
}) {
  const searchParams = await props.searchParams
  const params = await props.params
  const api = await getServerSideAPI()
  // Bypass the 10 min ISR cache so the New Product CTA gating reflects
  // current subaccount_status the moment payouts are activated.
  const organization = await getOrganizationBySlugOrNotFound(
    api,
    params.organization,
    true,
  )
  const { pagination, sorting } = parseSearchParams(
    searchParams,
    [{ id: 'name', desc: false }],
    20,
  )

  return (
    <ProductsPage
      organization={organization}
      pagination={pagination}
      sorting={sorting}
      query={searchParams.query}
    />
  )
}
