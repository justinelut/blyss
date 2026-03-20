import { StorefrontLayout } from '@/components/Creators/StorefrontLayout'
import { getServerSideAPI } from '@/utils/client/serverside'
import { unwrap } from '@polar-sh/client'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface CreatorStorefrontPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tab?: string }>
}

export async function generateMetadata({
  params,
}: CreatorStorefrontPageProps): Promise<Metadata> {
  const { slug } = await params
  const api = await getServerSideAPI()

  try {
    const creator = await unwrap(
      api.GET('/v1/creators/{slug}', {
        params: { path: { slug } },
      }),
    )

    const title = `${creator.name} | Blyss`
    const description =
      creator.bio || `View products and subscriptions from ${creator.name}`

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        siteName: 'Blyss',
        type: 'profile',
        images: creator.avatar_url ? [creator.avatar_url] : [],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: creator.avatar_url ? [creator.avatar_url] : [],
      },
      alternates: {
        canonical: `/creator/${slug}`,
      },
    }
  } catch {
    return {
      title: 'Creator Not Found | Blyss',
      description: 'The creator you are looking for does not exist.',
    }
  }
}

export default async function CreatorStorefrontPage({
  params,
  searchParams,
}: CreatorStorefrontPageProps) {
  const { slug } = await params
  const { tab } = await searchParams
  const api = await getServerSideAPI()

  let creator
  try {
    creator = await unwrap(
      api.GET('/v1/creators/{slug}', {
        params: { path: { slug } },
      }),
    )
  } catch {
    notFound()
  }

  const activeTab = tab || 'overview'

  return <StorefrontLayout creator={creator} activeTab={activeTab} />
}
