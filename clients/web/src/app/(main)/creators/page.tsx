import { Metadata } from 'next'
import { getServerSideAPI } from '@/utils/client/serverside'
import { unwrap } from '@/lib/api'
import { JsonLd } from '@/design'
import { CreatorsDirectoryPage } from '@/components/Marketplace/CreatorsDirectoryPage'

// ISR — regenerate the directory at most once per minute.
export const dynamic = "force-dynamic"
export const revalidate = 60

export const metadata: Metadata = {
  title: 'Kenyan Creators on Blyss · Designers, Writers, Musicians, Educators',
  description:
    'Browse Kenyan creators selling digital products. Designers, writers, musicians, educators, photographers, and producers based in Nairobi, Mombasa, Kisumu, and beyond. Pay with M-Pesa or card.',
  keywords:
    'Kenyan creators, Nairobi designers, Kenyan musicians, Kenyan ebooks authors, sell digital products Kenya, creator economy Kenya, M-Pesa creator marketplace',
  alternates: { canonical: 'https://blyss.co.ke/creators' },
  openGraph: {
    title: 'Kenyan Creators on Blyss',
    description:
      'Browse Kenyan creators selling digital products. Designers, writers, musicians, educators, photographers, and producers across Kenya.',
    siteName: 'Blyss',
    type: 'website',
    locale: 'en_KE',
    images: [
      {
        url: 'https://cdn.blyss.co.ke/brand/og-default.png',
        width: 1200,
        height: 630,
        alt: 'Kenyan creators on Blyss',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kenyan Creators on Blyss',
    description:
      'Designers, writers, musicians, educators, photographers, and producers from across Kenya.',
    images: ['https://cdn.blyss.co.ke/brand/og-default.png'],
  },
  robots: { index: true, follow: true },
}

export default async function CreatorsPage() {
  const api = await getServerSideAPI()

  // Fetch all public creators + try to identify a spotlight candidate.
  const creatorsResp = await unwrap(
    api.GET('/v1/organizations/public', {
      params: { query: { limit: 100 } as any },
    }),
  ).catch(() => ({ items: [] as any[] }))

  const creators = (creatorsResp.items ?? []) as any[]

  // Spotlight: prefer a creator flagged is_featured_spotlight; fallback to
  // the first featured creator if no spotlight flag exists yet.
  const spotlight =
    creators.find((c) => c.is_featured_spotlight === true) ??
    creators.find((c) => c.is_featured === true) ??
    null

  // Try to fetch the spotlight creator's top product (best-selling proxy =
  // first public product). Non-fatal if unavailable.
  let spotlightTopProduct = null
  if (spotlight?.id) {
    try {
      const productsResp = await unwrap(
        api.GET('/v1/products/public', {
          params: {
            query: {
              organization_id: spotlight.id,
              limit: 1,
            } as any,
          },
        }),
      )
      spotlightTopProduct = productsResp.items?.[0] ?? null
    } catch {
      spotlightTopProduct = null
    }
  }

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Independent Creators · Blyss',
          url: 'https://blyss.co.ke/creators',
          description:
            "Meet creators making things worth supporting. Designers, writers, musicians, educators, photographers.",
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: creators.length,
            itemListElement: creators.slice(0, 24).map((c: any, i: number) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: `https://blyss.co.ke/creators/${c.slug ?? c.id}`,
              name: c.name,
            })),
          },
        }}
      />
      <CreatorsDirectoryPage
        initialCreators={creators}
        featuredSpotlight={spotlight}
        spotlightTopProduct={spotlightTopProduct}
      />
    </>
  )
}
