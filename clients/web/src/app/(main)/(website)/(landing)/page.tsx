import { unwrap, schemas } from '@/lib/api'
import { createServerSideAPI } from '@/utils/client'
import { getServerGeo } from '@/lib/geo/server'
import { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import HomePage from './HomePage'
import type { CategoryTile } from '@/components/Marketplace/BrowseByCraft'

// ISR: regenerate the home page at most once per minute. Cloudflare caches
// the rendered HTML; first render after a publish hits this revalidation.
export const dynamic = "force-dynamic"
export const revalidate = 60

// Anti-slop SEO copy for the homepage. The original ("The modern modern
// marketplace…") had a literal duplicate word AND used "modern" as a
// promotional adjective — both flagged in
// .kiro/skills/anti-slop-writing/references/vocabulary-banlist.md. The
// rewrite names the actual product types, the actual payment rail
// (M-Pesa), and the actual creator payout window (24 hours). These
// concrete phrases double as Google + AI-search anchors for queries
// like "buy ebooks Kenya M-Pesa" or "creator marketplace".
// Concrete phrases (templates / ebooks / beats / presets / courses)
// double as Google + AI-search anchors. Title uses `absolute` so the
// root layout's '%s · Blyss' template doesn't append a duplicate
// "· Blyss" — the home page already names the brand.
export const metadata: Metadata = {
  title: {
    absolute: 'Blyss — Templates, Ebooks, Beats from Independent Creators',
  },
  description:
    'Templates, ebooks, beats, presets, courses, and subscription tiers from independent creators. Instant download. Creators paid within 24 hours.',
  keywords:
    'digital products marketplace, buy templates online, buy ebooks online, buy beats online, buy presets online, creator marketplace, independent creators, instant download, blyss.co.ke',
  alternates: { canonical: 'https://blyss.co.ke' },
  openGraph: {
    siteName: 'Blyss',
    type: 'website',
    title: 'Blyss — Templates, Ebooks, Beats from Independent Creators',
    description:
      'Templates, ebooks, beats, presets, courses, and subscription tiers from independent creators. Payouts within 24 hours.',
    images: [
      {
        url: 'https://cdn.blyss.co.ke/brand/og-default.png',
        width: 1200,
        height: 630,
        alt: 'Blyss — independent creator marketplace',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blyss — Independent Creator Marketplace',
    description:
      'Templates, ebooks, beats, presets, and courses by independent creators. Payouts within 24 hours.',
    images: ['https://cdn.blyss.co.ke/brand/og-default.png'],
  },
}

async function getFeaturedProducts() {
  try {
    const cookieStore = await cookies()
    const headersList = await headers()
    const serverApi = await createServerSideAPI(headersList, cookieStore)
    const { currency } = await getServerGeo()

    // Prefer hand-curated featured products, but fall back to most-recent
    // public products so the home page never reads empty just because the
    // operator hasn't flagged anything yet. Filter by the visitor's currency
    // (geo) — products the creator didn't price in that currency are hidden.
    const featured = await unwrap(
      serverApi.GET('/v1/products/public', {
        params: { query: { is_featured: true, limit: 8, page: 1, currency } },
      }),
    )
    if (featured.items?.length) return featured.items

    const recent = await unwrap(
      serverApi.GET('/v1/products/public', {
        params: { query: { limit: 8, page: 1, currency } },
      }),
    )
    return recent.items ?? []
  } catch (error) {
    console.error('Failed to fetch products:', error)
    return []
  }
}

async function getFeaturedSubscriptions() {
  try {
    const cookieStore = await cookies()
    const headersList = await headers()
    const serverApi = await createServerSideAPI(headersList, cookieStore)

    // Featured subscriptions first, then any recurring product as fallback.
    const featured = await unwrap(
      serverApi.GET('/v1/subscriptions/public', {
        params: { query: { is_featured: true, limit: 6 } },
      }),
    )
    if (featured.items?.length) return featured.items

    // No /v1/subscriptions/public without is_featured? Use products with
    // is_recurring=true instead — same shape from the consumer's POV.
    const { currency } = await getServerGeo()
    const recurring = await unwrap(
      serverApi.GET('/v1/products/public', {
        params: { query: { is_recurring: true, limit: 6, currency } },
      }),
    )
    // The home's FeaturedSubscriptions component accepts Subscription-shape
    // but Product-shape works for the rendered cards (they share name +
    // prices + organization).
    return (recurring.items ?? []) as unknown as schemas['Subscription'][]
  } catch (error) {
    console.error('Failed to fetch subscriptions:', error)
    return []
  }
}

async function getTrendingCreators() {
  try {
    const cookieStore = await cookies()
    const headersList = await headers()
    const serverApi = await createServerSideAPI(headersList, cookieStore)

    // Featured creators, falling back to the public creators directory.
    const featured = await unwrap(
      serverApi.GET('/v1/organizations/public', {
        params: { query: { is_featured: true, limit: 4 } },
      }),
    )
    if (featured.items?.length) return featured.items

    // Public creators directory returns an array of creators directly.
    const directory = await unwrap(
      serverApi.GET('/v1/organizations/creators', {
        params: { query: { limit: 4 } },
      }),
    )
    // The directory endpoint returns Organization-shape items.
    const items = Array.isArray(directory) ? directory : (directory as { items?: unknown[] }).items ?? []
    return items as schemas['Organization'][]
  } catch (error) {
    console.error('Failed to fetch creators:', error)
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

interface MarketplaceStats {
  creators: number
  products: number
  total_paid_out: number
  total_paid_out_currency: string
  settlements_count: number
}

async function getMarketplaceStats(): Promise<MarketplaceStats | null> {
  try {
    const cookieStore = await cookies()
    const headersList = await headers()
    const serverApi = await createServerSideAPI(headersList, cookieStore)
    const result = (await (
      serverApi as unknown as {
        GET: (
          path: string,
          init: { params: { query: Record<string, unknown> } },
        ) => Promise<{ data?: MarketplaceStats; error?: unknown }>
      }
    ).GET('/v1/marketplace/stats', { params: { query: {} } })) as {
      data?: MarketplaceStats
      error?: unknown
    }
    return result?.data ?? null
  } catch (error) {
    console.error('Failed to fetch marketplace stats:', error)
    return null
  }
}

export default async function Page() {
  const [
    featuredProducts,
    featuredSubscriptions,
    trendingCreators,
    categories,
    stats,
  ] = await Promise.all([
    getFeaturedProducts(),
    getFeaturedSubscriptions(),
    getTrendingCreators(),
    getCategories(),
    getMarketplaceStats(),
  ])

  return (
    <HomePage
      featuredProducts={featuredProducts}
      featuredSubscriptions={featuredSubscriptions}
      trendingCreators={trendingCreators}
      categories={categories}
      stats={stats}
    />
  )
}
