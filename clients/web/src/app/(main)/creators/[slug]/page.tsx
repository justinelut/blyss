import { CreatorStorefront } from '@/components/CreatorStorefront/CreatorStorefront'
import { getServerSideAPI } from '@/utils/client/serverside'
import { unwrap } from '@/lib/api'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const api = await getServerSideAPI()

  try {
    const creator = await unwrap(
      api.GET('/v1/organizations/creators/{slug}', {
        params: { path: { slug } },
      }),
    )

    return {
      title: `${creator.name} | Blyss`,
      description: creator.bio || `Discover products from ${creator.name}`,
      openGraph: {
        title: `${creator.name} | Blyss`,
        description: creator.bio || `Discover products from ${creator.name}`,
        siteName: 'Blyss',
        type: 'profile',
      },
    }
  } catch {
    return {
      title: 'Creator Not Found | Blyss',
    }
  }
}

export default async function CreatorStorefrontPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const api = await getServerSideAPI()

  try {
    const creator = await unwrap(
      api.GET('/v1/organizations/creators/{slug}', {
        params: { path: { slug } },
      }),
    )

    return (
      <CreatorStorefront
        organization={{
          id: creator.id,
          name: creator.name,
          slug: creator.slug,
          avatar_url: creator.avatar_url,
          bio: creator.bio,
          email: creator.email,
          profile_settings: {
            enabled: true,
          },
        }}
        products={creator.products || []}
        subscriptions={[]}
      />
    )
  } catch {
    notFound()
  }
}
