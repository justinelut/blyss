import { api } from '@/utils/client'
import { unwrap } from '@/lib/api'
import { Metadata } from 'next'
import { MarketplaceClientWrapper } from './MarketplaceClientWrapper'

export const metadata: Metadata = {
  title: 'Marketplace - Discover Amazing Products from Kenyan Creators',
  description:
    'Support local creators and find unique digital products, courses, and more on the Blyss marketplace.',
  openGraph: {
    title: 'Marketplace - Discover Amazing Products from Kenyan Creators',
    description:
      'Support local creators and find unique digital products, courses, and more on the Blyss marketplace.',
    type: 'website',
  },
  other: {
    // Add resource hints for better performance
    'x-dns-prefetch-control': 'on',
  },
}

// Revalidate every 5 minutes for fresh content while maintaining performance
export const revalidate = 300

interface SearchParams {
  search?: string
  category?: string
  min_price?: string
  max_price?: string
  sort?: string
  page?: string
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const search = searchParams.search || undefined
  const category = searchParams.category || undefined
  const minPrice = searchParams.min_price
    ? parseInt(searchParams.min_price, 10)
    : undefined
  const maxPrice = searchParams.max_price
    ? parseInt(searchParams.max_price, 10)
    : undefined
  const sort =
    (searchParams.sort as 'newest' | 'price_asc' | 'price_desc') || 'newest'
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1

  const [productsData, featuredData] = await Promise.all([
    unwrap(
      api.GET('/v1/products/public', {
        params: {
          query: {
            search,
            category,
            min_price: minPrice,
            max_price: maxPrice,
            sort,
            page,
            limit: 24,
          },
        },
      }),
    ).catch(() => ({ items: [], pagination: { total_count: 0, max_page: 1 } })),
    unwrap(
      api.GET('/v1/products/public', {
        params: {
          query: {
            is_featured: true,
            limit: 6,
          },
        },
      }),
    ).catch(() => ({ items: [], pagination: { total_count: 0, max_page: 1 } })),
  ])

  return (
    <MarketplaceClientWrapper
      initialProducts={productsData.items}
      initialTotalCount={productsData.pagination.total_count}
      initialTotalPages={productsData.pagination.max_page}
      initialFeaturedProducts={featuredData.items}
      initialFilters={{
        search: search || null,
        category: category || null,
        min_price: minPrice || null,
        max_price: maxPrice || null,
        sort: sort || 'newest',
        page: page || 1,
      }}
    />
  )
}
