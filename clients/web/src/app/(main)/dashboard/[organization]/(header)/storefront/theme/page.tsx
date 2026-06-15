import { Metadata } from 'next'

import { getServerSideAPI } from '@/utils/client/serverside'
import { getOrganizationBySlugOrNotFound } from '@/utils/organization'

import { StorefrontThemeEditor } from './StorefrontThemeEditor'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Storefront — Theme',
    robots: { index: false, follow: false },
  }
}

/**
 * /dashboard/{slug}/storefront/theme — the in-dashboard storefront
 * editor (plan §19.8). Lands here from the sidebar 'Storefront' entry
 * (NOT a redirect to the public /creators/{slug} — see §19.8.0).
 *
 * v1 ships the Brand tab only. Layout + Sections tabs are present but
 * disabled with a "Coming soon" badge until v2/v3.
 */
export default async function Page(props: {
  params: Promise<{ organization: string }>
}) {
  const params = await props.params
  const api = await getServerSideAPI()
  const organization = await getOrganizationBySlugOrNotFound(
    api,
    params.organization,
  )

  return <StorefrontThemeEditor organization={organization} />
}
