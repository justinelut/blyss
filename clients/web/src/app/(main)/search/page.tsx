import { Metadata } from 'next'
import { unwrap } from '@/lib/api'
import { api } from '@/utils/client'
import { getServerCurrency } from '@/lib/geo/server'
import { SearchResults } from './SearchResults'

export const metadata: Metadata = {
  title: 'Search · Blyss',
  description: 'Find digital products from independent creators on Blyss.',
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>
}) {
  const { q, category } = await searchParams
  const query = q?.trim() || ''

  let products: any[] = []
  let totalCount = 0

  if (query) {
    try {
      const currency = await getServerCurrency()
      const result = await unwrap(
        api.GET('/v1/products/public', {
          params: {
            query: { search: query, category, currency, limit: 24 },
          },
        }),
      )
      products = result.items ?? []
      totalCount = result.pagination?.total_count ?? products.length
    } catch {
      products = []
    }
  }

  return (
    <SearchResults
      query={query}
      category={category}
      products={products}
      totalCount={totalCount}
    />
  )
}
