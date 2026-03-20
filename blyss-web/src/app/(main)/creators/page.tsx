import { CreatorsDirectory } from '@/components/Creators/CreatorsDirectory'
import { getServerSideAPI } from '@/utils/client/serverside'
import { unwrap } from '@polar-sh/client'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Discover Creators | Blyss',
  description:
    'Browse creators and their products on the Blyss marketplace. Discover digital products, subscriptions, and more from talented creators.',
  openGraph: {
    title: 'Discover Creators | Blyss',
    description:
      'Browse creators and their products on the Blyss marketplace. Discover digital products, subscriptions, and more from talented creators.',
    siteName: 'Blyss',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Discover Creators | Blyss',
    description:
      'Browse creators and their products on the Blyss marketplace. Discover digital products, subscriptions, and more from talented creators.',
  },
}

export default async function CreatorsPage() {
  const api = await getServerSideAPI()

  const creators = await unwrap(
    api.GET('/v1/creators', {
      params: {
        query: {
          limit: 100,
          offset: 0,
        },
      },
    }),
  )

  return <CreatorsDirectory initialCreators={creators} />
}
