import { getServerSideAPI } from '@/utils/client/serverside'
import { getOrganizationOrNotFound } from '@/utils/customerPortal'
import { redirect } from 'next/navigation'

export default async function Page(props: {
  params: Promise<{ organization: string }>
  searchParams: Promise<{ [key: string]: string }>
}) {
  const searchParams = await props.searchParams
  const params = await props.params

  // P7: Signed-in Blyss buyers go to the unified portal overview.
  // Magic-link recipients (token in URL) keep the per-creator path.
  if (!searchParams.customer_session_token && !searchParams.member_session_token) {
    const { headers } = await import('next/headers')
    const cookie = (await headers()).get('cookie') || ''
    if (cookie.includes('polar_session=')) {
      redirect('/portal/orders')
    }
  }

  const api = await getServerSideAPI()
  await getOrganizationOrNotFound(api, params.organization, searchParams)

  redirect(
    `/${params.organization}/portal/overview?${new URLSearchParams(searchParams)}`,
  )
}
