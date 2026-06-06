import { Metadata } from 'next'
import { api } from '@/utils/client'
import { unwrap } from '@/lib/api'
import { getServerCurrency } from '@/lib/geo/server'
import { JsonLd } from '@/design'
import { BrowsePage } from '@/components/Marketplace/BrowsePage'
import type { FilterCategory } from '@/components/Marketplace/BrowseFilterRail'

// ISR — regenerate the marketplace shell at most once per minute. Filtered
// query results are fetched client-side via TanStack Query so paginated
// requests don't go through ISR.
export const dynamic = "force-dynamic"
export const revalidate = 60

export const metadata: Metadata = {
  title: 'The Marketplace · Blyss',
  description:
    'Browse digital products from independent creators. Filter by category, price, and type. Pay with M-Pesa or card.',
  alternates: { canonical: 'https://blyss.co.ke/marketplace' },
  openGraph: {
    title: 'The Marketplace · Blyss',
    description:
      'Browse digital products from independent creators. Filter by category, price, and type.',
    type: 'website',
    locale: 'en_KE',
    images: [
      {
        url: 'https://cdn.blyss.co.ke/brand/og-default.png',
        width: 1200,
        height: 630,
        alt: 'Blyss marketplace',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Marketplace · Blyss',
    description: 'Browse digital products from independent creators.',
    images: ['https://cdn.blyss.co.ke/brand/og-default.png'],
  },
}

interface SearchParams {
  search?: string
  category?: string
  min_price?: string
  max_price?: string
  type?: string
  currency?: string
  sort?: string
  page?: string
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const search = params.search || undefined
  const category = params.category || undefined
  const minPrice = params.min_price ? parseInt(params.min_price, 10) : undefined
  const maxPrice = params.max_price ? parseInt(params.max_price, 10) : undefined
  const sort =
    (params.sort as 'newest' | 'price_asc' | 'price_desc' | 'trending') ||
    'newest'
  const type =
    (params.type as 'all' | 'one_time' | 'subscription') || 'all'
  // Currency follows geo (US→USD default, KE→KES) unless the URL/switcher
  // overrode it. We filter the grid to this currency (no FX conversion).
  const geoCurrency = await getServerCurrency()
  const currency = (params.currency as string) || geoCurrency.toUpperCase()
  const page = params.page ? parseInt(params.page, 10) : 1

  const [productsData, categoriesData] = await Promise.all([
    unwrap(
      api.GET('/v1/products/public', {
        params: {
          query: {
            search,
            category,
            min_price: minPrice,
            max_price: maxPrice,
            // Honor the type chip on first paint so the SSR'd grid already
            // matches the URL state (the client-side query then takes over).
            is_recurring:
              type === 'subscription'
                ? true
                : type === 'one_time'
                  ? false
                  : undefined,
            sort: sort === 'trending' ? 'newest' : sort,
            currency: currency.toLowerCase(),
            page,
            limit: 24,
          } as Record<string, unknown>,
        },
      }),
    ).catch(() => ({
      items: [],
      pagination: { total_count: 0, max_page: 1 },
    })),
    unwrap(
      api.GET('/v1/categories/', { params: { query: { limit: 50 } } }),
    ).catch(() => ({ items: [] })),
  ])

  const categories: FilterCategory[] = (categoriesData.items ?? []).map(
    (c: any) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      product_count: c.product_count,
    }),
  )

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'The Marketplace · Blyss',
          url: 'https://blyss.co.ke/marketplace',
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: productsData.pagination?.total_count ?? 0,
            itemListElement: (productsData.items ?? [])
              .slice(0, 24)
              .map((p: any, i: number) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: `https://blyss.co.ke/product/${p.id}`,
                name: p.name,
              })),
          },
        }}
      />
      <BrowsePage
        initialProducts={productsData.items}
        initialTotalCount={productsData.pagination?.total_count ?? 0}
        categories={categories}
        initialFilters={{
          search: search || null,
          category: category || null,
          min_price: minPrice ?? null,
          max_price: maxPrice ?? null,
          type,
          currency,
          sort,
          page,
        }}
      />
    </>
  )
}
