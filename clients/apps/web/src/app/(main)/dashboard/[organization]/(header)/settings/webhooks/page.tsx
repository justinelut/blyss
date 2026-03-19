import { getServerSideAPI } from '@/utils/client/serverside'
import { FEATURES } from '@/utils/config'
import { getOrganizationBySlugOrNotFound } from '@/utils/organization'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import WebhooksPage from './WebhooksPage'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Webhooks', // " | Polar is added by the template"
  }
}

export default async function Page(props: {
  params: Promise<{ organization: string }>
}) {
  const params = await props.params

  if (!FEATURES.webhooks) {
    redirect(`/dashboard/${params.organization}`)
  }

  const api = await getServerSideAPI()
  const organization = await getOrganizationBySlugOrNotFound(
    api,
    params.organization,
  )

  return <WebhooksPage organization={organization} />
}
