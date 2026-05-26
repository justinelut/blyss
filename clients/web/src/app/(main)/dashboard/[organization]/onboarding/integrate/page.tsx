import { getServerSideAPI } from '@/utils/client/serverside'
import { getOrganizationBySlugOrNotFound } from '@/utils/organization'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import OnboardingIntegratePage from './OnboardingIntegratePage'

export const metadata: Metadata = {
  title: 'Share your product · Onboarding',
}

export default async function Page(props: {
  params: Promise<{ organization: string }>
  searchParams: Promise<{ productId?: string }>
}) {
  const params = await props.params
  const { productId } = await props.searchParams
  if (!productId) notFound()

  const api = await getServerSideAPI()
  const organization = await getOrganizationBySlugOrNotFound(
    api,
    params.organization,
  )

  const { data: product, error } = await api.GET('/v1/products/{id}', {
    params: { path: { id: productId } },
  })
  if (error || !product) notFound()

  return (
    <OnboardingIntegratePage organization={organization} product={product} />
  )
}
