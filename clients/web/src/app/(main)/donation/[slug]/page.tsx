import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getServerSideAPI } from '@/utils/client/serverside'
import { unwrap } from '@/lib/api'
import { DonationPageClient } from './DonationPageClient'

interface DonationPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: DonationPageProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const api = await getServerSideAPI()
    const creator = await unwrap(
      api.GET('/v1/organizations/creators/{slug}', {
        params: { path: { slug } },
      }),
    )
    return {
      title: `Tip ${creator.name} · Blyss`,
      description: `Send a one-time tip to support ${creator.name}.`,
      robots: { index: false, follow: true },
    }
  } catch {
    return { title: 'Tip a creator · Blyss', robots: { index: false } }
  }
}

export default async function Page({ params }: DonationPageProps) {
  const { slug } = await params

  let creator: { id: string; name: string; slug: string; avatar_url?: string | null; bio?: string | null }
  try {
    const api = await getServerSideAPI()
    const fetched = await unwrap(
      api.GET('/v1/organizations/creators/{slug}', {
        params: { path: { slug } },
      }),
    )
    creator = {
      id: fetched.id,
      name: fetched.name,
      slug: fetched.slug,
      avatar_url: fetched.avatar_url ?? null,
      bio: fetched.bio ?? null,
    }
  } catch {
    notFound()
  }

  return (
    <DonationPageClient
      creator={creator}
    />
  )
}
