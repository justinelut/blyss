import { CustomerPortalSettings } from '@/components/CustomerPortal/CustomerPortalSettings'
import { getServerSideAPI } from '@/utils/client/serverside'
import { getOrganizationOrNotFound } from '@/utils/customerPortal'
import type { Metadata } from 'next'

export async function generateMetadata(props: {
  params: Promise<{ organization: string }>
}): Promise<Metadata> {
  const params = await props.params
  const api = await getServerSideAPI()
  const { organization } = await getOrganizationOrNotFound(
    api,
    params.organization,
  )

  return {
    title: `Customer Portal · ${organization.name}| ${organization.name}`, // " | Blyss is added by the template"
    openGraph: {
      title: `Customer Portal · ${organization.name}| ${organization.name}`,
      description: `Customer Portal · ${organization.name}| ${organization.name}`,
      siteName: 'Blyss',
      type: 'website',
      images: [
        {
          url: `https://blyss.co.ke/og?org=${organization.slug}`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      images: [
        {
          url: `https://blyss.co.ke/og?org=${organization.slug}`,
          width: 1200,
          height: 630,
          alt: `${organization.name}`,
        },
      ],
      card: 'summary_large_image',
      title: `Customer Portal · ${organization.name}| ${organization.name}`,
      description: `Customer Portal · ${organization.name}| ${organization.name}`,
    },
  }
}

export default async function Page(props: {
  params: Promise<{ organization: string }>
  searchParams: Promise<{
    customer_session_token?: string
    member_session_token?: string
    setup_intent_client_secret?: string
    setup_intent?: string
  }>
}) {
  const { customer_session_token, member_session_token, ...searchParams } =
    await props.searchParams
  const params = await props.params
  const token = customer_session_token ?? member_session_token
  const api = await getServerSideAPI(token)

  const { organization } = await getOrganizationOrNotFound(
    api,
    params.organization,
    searchParams,
  )

  return (
    <CustomerPortalSettings
      customerSessionToken={token}
      organization={organization}
      setupIntentParams={
        searchParams.setup_intent_client_secret && searchParams.setup_intent
          ? {
              setup_intent_client_secret:
                searchParams.setup_intent_client_secret,
              setup_intent: searchParams.setup_intent,
            }
          : undefined
      }
    />
  )
}
