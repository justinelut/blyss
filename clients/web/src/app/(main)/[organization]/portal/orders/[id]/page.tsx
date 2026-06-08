import { getServerSideAPI } from '@/utils/client/serverside'
import { getOrganizationOrNotFound } from '@/utils/customerPortal'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import OrdersPage from './OrdersPage'

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
    title: `Customer Portal | ${organization.name}`, // " | Blyss is added by the template"
    openGraph: {
      title: `Customer Portal | ${organization.name} on Blyss`,
      description: `Customer Portal | ${organization.name} on Blyss`,
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
          alt: `${organization.name} on Blyss`,
        },
      ],
      card: 'summary_large_image',
      title: `Customer Portal | ${organization.name} on Blyss`,
      description: `Customer Portal | ${organization.name} on Blyss`,
    },
  }
}

export default async function Page(props: {
  params: Promise<{ organization: string; id: string }>
  searchParams: Promise<{
    customer_session_token?: string
    member_session_token?: string
  }>
}) {
  const { customer_session_token, member_session_token, ...searchParams } =
    await props.searchParams
  const params = await props.params

  // P7: Redirect signed-in Blyss buyers to the unified /portal/* surface.
  // We only redirect when the buyer is NOT using a magic-link customer
  // session token — those flows must continue to work for guest buyers
  // and old order emails. Skipping the redirect when the token is
  // present keeps the legacy magic-link path operational as a backstop.
  if (!customer_session_token && !member_session_token) {
    const { headers } = await import('next/headers')
    const cookie = (await headers()).get('cookie') || ''
    if (cookie.includes('polar_session=')) {
      redirect(`/portal/orders/${params.id}`)
    }
  }

  const token = customer_session_token ?? member_session_token
  const api = await getServerSideAPI(token)
  const { organization } = await getOrganizationOrNotFound(
    api,
    params.organization,
    searchParams,
  )

  const {
    data: order,
    error,
    response,
  } = await api.GET('/v1/customer-portal/orders/{id}', {
    params: {
      path: {
        id: params.id,
      },
    },
    cache: 'no-cache',
    next: {
      tags: [`customer_portal`],
    },
  })

  if (response.status === 401) {
    redirect(`/${organization.slug}/portal/request`)
  }

  if (response.status === 403) {
    // Member doesn't have billing permissions - redirect to overview
    redirect(`/${organization.slug}/portal`)
  }

  if (error) {
    throw error
  }

  return <OrdersPage order={order} customerSessionToken={token as string} />
}
