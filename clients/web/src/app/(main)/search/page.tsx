import { Metadata } from 'next'
import { unwrap, schemas } from '@/lib/api'
import { api } from '@/utils/client'
import { getServerCurrency } from '@/lib/geo/server'
import { SearchResults } from './SearchResults'
import type { CategoryTile } from '@/components/Marketplace/BrowseByCraft'

export const metadata: Metadata = {
  title: 'Search',
  description: 'Find digital products and creators.',
}

/**
 * Catalogue + Discovery search.
 *
 * Three render modes the client decides between:
 * 1. Empty (no `q`)        — trending products + categories + featured creators
 * 2. Hits (q + results)    — 4-up grid of MarketplaceProductCard + creators row
 * 3. No hits (q + 0)       — productive empty state with trending products
 *
 * Server fetches everything we'd want for any of those modes in parallel,
 * cheap. The client picks what to render. Keeps this page snappy without an
 * extra request waterfall on first paint.
 */
async function getSearchHits(query: string, category: string | undefined) {
  if (!query) return { items: [] as schemas['Product'][], totalCount: 0 }
  try {
    const currency = await getServerCurrency()
    const result = await unwrap(
      api.GET('/v1/products/public', {
        params: {
          query: { search: query, category, currency, limit: 24 },
        },
      }),
    )
    return {
      items: (result.items ?? []) as schemas['Product'][],
      totalCount: result.pagination?.total_count ?? result.items?.length ?? 0,
    }
  } catch {
    return { items: [] as schemas['Product'][], totalCount: 0 }
  }
}

async function getTrendingProducts() {
  try {
    const currency = await getServerCurrency()
    // Featured first, fall back to most-recent. Same pattern as the home
    // page's featured-products fetch, deliberately limited to 8 so we can
    // render a clean 4×2 grid without the section feeling padded.
    const featured = await unwrap(
      api.GET('/v1/products/public', {
        params: { query: { is_featured: true, limit: 8, page: 1, currency } },
      }),
    )
    if (featured.items?.length) return featured.items as schemas['Product'][]
    const recent = await unwrap(
      api.GET('/v1/products/public', {
        params: { query: { sort: 'newest', limit: 8, page: 1, currency } },
      }),
    )
    return (recent.items ?? []) as schemas['Product'][]
  } catch {
    return [] as schemas['Product'][]
  }
}

async function getFeaturedCreators() {
  try {
    // /v1/organizations/creators returns Organization[]; we slice to 4.
    // (No is_featured flag on this endpoint — the dashboard's featured
    //  toggle ships once we wire a `featured_creators` admin tool.)
    const directory = await unwrap(
      api.GET('/v1/organizations/creators', {
        params: { query: { limit: 4 } },
      }),
    )
    const items = Array.isArray(directory)
      ? directory
      : ((directory as { items?: unknown[] }).items ?? [])
    return items as schemas['Organization'][]
  } catch {
    return [] as schemas['Organization'][]
  }
}

async function getCategories(): Promise<CategoryTile[]> {
  try {
    const result = await unwrap(api.GET('/v1/categories/', {}))
    return ((result.items ?? []) as Array<{
      id: string
      name: string
      slug: string
      cover_image_url?: string | null
      product_count?: number
    }>)
      .slice(0, 6)
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        cover_image_url: c.cover_image_url ?? null,
        product_count: c.product_count,
      }))
  } catch {
    return []
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>
}) {
  const { q, category } = await searchParams
  const query = q?.trim() || ''

  const [hits, trendingProducts, featuredCreators, categories] =
    await Promise.all([
      getSearchHits(query, category),
      getTrendingProducts(),
      getFeaturedCreators(),
      getCategories(),
    ])

  return (
    <SearchResults
      query={query}
      category={category}
      products={hits.items}
      totalCount={hits.totalCount}
      trendingProducts={trendingProducts}
      featuredCreators={featuredCreators}
      categories={categories}
    />
  )
}
