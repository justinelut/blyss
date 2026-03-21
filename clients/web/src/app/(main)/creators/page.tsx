import { CreatorsDirectory } from '@/components/Creators/CreatorsDirectory'
import { getServerSideAPI } from '@/utils/client/serverside'
import { unwrap } from '@/lib/api'
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
  alternates: {
    canonical: '/creators',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default async function CreatorsPage() {
  const api = await getServerSideAPI()

  const creators = await unwrap(
    api.GET('/v1/organizations/public', {
      params: {
        query: {
          limit: 100,
        },
      },
    }),
  )

  return <CreatorsDirectory initialCreators={creators.items || []} />
}
