import { getServerSideAPI } from '@/utils/client/serverside'
import { getOrganizationBySlugOrNotFound } from '@/utils/organization'
import { Metadata } from 'next'
import OnboardingProductPage from './OnboardingProductPage'

export async function generateMetadata(props: {
  params: Promise<{ organization: string }>
}): Promise<Metadata> {
  const { organization } = await props.params
  return {
    title: `Set up ${organization} · Onboarding`,
  }
}

export default async function Page(props: {
  params: Promise<{ organization: string }>
  searchParams: Promise<{
    toast?: string
    status?: string
    status_description?: string
  }>
}) {
  const params = await props.params
  const searchParams = await props.searchParams
  const api = await getServerSideAPI()
  const organization = await getOrganizationBySlugOrNotFound(
    api,
    params.organization,
  )

  return (
    <OnboardingProductPage
      organization={organization}
      welcomeStatus={searchParams.status}
      welcomeStatusDescription={searchParams.status_description}
    />
  )
}
