import { getServerSideAPI } from '@/utils/client/serverside'
import { DataTableSearchParams, parseSearchParams } from '@/utils/datatable'
import { getOrganizationBySlugOrNotFound } from '@/utils/organization'
import { Metadata } from 'next'
import TipsPage from './TipsPage'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Tips',
  }
}

export default async function Page(props: {
  params: Promise<{ organization: string }>
  searchParams: Promise<DataTableSearchParams>
}) {
  const searchParams = await props.searchParams
  const params = await props.params
  const api = await getServerSideAPI()
  const organization = await getOrganizationBySlugOrNotFound(
    api,
    params.organization,
  )

  const { pagination } = parseSearchParams(
    searchParams,
    [{ id: 'created_at', desc: true }],
    20,
  )

  return <TipsPage organization={organization} pagination={pagination} />
}
