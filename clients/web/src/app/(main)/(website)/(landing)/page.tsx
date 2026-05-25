import { unwrap } from '@/lib/api'
import { createServerSideAPI } from '@/utils/client'
import { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import HomePage from './HomePage'
import type { CategoryTile } from '@/components/Marketplace/BrowseByCraft'

// ISR: regenerate the home page at most once per minute. Cloudflare caches
// the rendered HTML; first render after a publish hits this revalidation.
export const dynamic = "force-dynamic"
export const revalidate = 60

export const metadata: Metadata = {
  title: "Blyss — Kenya's Modern Creator Marketplace",
  description:
    'The modern marketplace for Kenyan creators. Templates, ebooks, beats, courses, subscription tiers. M-Pesa or card. Paid out within 24 hours.',
  keywords:
    'kenya creator marketplace, sell digital products kenya, m-pesa payments, online marketplace kenya, sell ebooks kenya, kenyan creators',
  alternates: { canonical: 'https://blyss.co.ke' },
  openGraph: {
    siteName: 'Blyss',
    type: 'website',
    locale: 'en_KE',
    title: "Blyss — Kenya's Modern Creator Marketplace",
    description:
      'The modern marketplace for Kenyan creators. M-Pesa or card. Paid out within 24 hours.',
    images: [
      {
        url: 'https://cdn.blyss.co.ke/brand/og-default.png',
        width: 1200,
        height: 630,
        alt: 'Blyss',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Blyss — Kenya's Modern Creator Marketplace",
    description:
      'The modern marketplace for Kenyan creators. M-Pesa or card. Paid out within 24 hours.',
    images: ['https://cdn.blyss.co.ke/brand/og-default.png'],
  },
}

async function getFeaturedProducts() {
  try {
    const cookieStore = await cookies()
    const headersList = await headers()
    const serverApi = await createServerSideAPI(headersList, cookieStore)
    const result = await unwrap(
      serverApi.GET('/v1/products/public', {
        params: { query: { is_featured: true, limit: 8, page: 1 } },
      }),
    )
    return result.items
  } catch (error) {
    console.error('Failed to fetch featured products:', error)
    return []
  }
}

async function getFeaturedSubscriptions() {
  try {
    const cookieStore = await cookies()
    const headersList = await headers()
    const serverApi = await createServerSideAPI(headersList, cookieStore)
    const result = await unwrap(
      serverApi.GET('/v1/subscriptions/public', {
        params: { query: { is_featured: true, limit: 6 } },
      }),
    )
    return result.items
  } catch (error) {
    console.error('Failed to fetch featured subscriptions:', error)
    return []
  }
}

async function getTrendingCreators() {
  try {
    const cookieStore = await cookies()
    const headersList = await headers()
    const serverApi = await createServerSideAPI(headersList, cookieStore)
    const result = await unwrap(
      serverApi.GET('/v1/organizations/public', {
        params: { query: { is_featured: true, limit: 4 } },
      }),
    )
    return result.items
  } catch (error) {
    console.error('Failed to fetch trending creators:', error)
    return []
  }
}

async function getCategories(): Promise<CategoryTile[]> {
  try {
    const cookieStore = await cookies()
    const headersList = await headers()
    const serverApi = await createServerSideAPI(headersList, cookieStore)
    const result = await unwrap(
      serverApi.GET('/v1/categories/', {
        params: { query: { limit: 6 } },
      }),
    )
    // Map API category to home-page tile shape
    return (result.items ?? []).map((c: any) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      cover_image_url: c.cover_image_url ?? null,
      product_count: c.product_count,
    }))
  } catch (error) {
    console.error('Failed to fetch categories:', error)
    return []
  }
}

export default async function Page() {
  const [featuredProducts, featuredSubscriptions, trendingCreators, categories] =
    await Promise.all([
      getFeaturedProducts(),
      getFeaturedSubscriptions(),
      getTrendingCreators(),
      getCategories(),
    ])

  return (
    <HomePage
      featuredProducts={featuredProducts}
      featuredSubscriptions={featuredSubscriptions}
      trendingCreators={trendingCreators}
      categories={categories}
    />
  )
}
