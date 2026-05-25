import { Metadata } from 'next'
import { unwrap } from '@/lib/api'
import { api } from '@/utils/client'
import { SearchResults } from './SearchResults'

export const metadata: Metadata = {
  title: 'Search · Blyss',
  description: 'Find digital products from Kenyan creators on Blyss.',
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
      const result = await unwrap(
        api.GET('/v1/products/public', {
          params: {
            query: { search: query, category, limit: 24 },
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
    <div className="bg-[var(--background)] pt-20 text-[var(--text-primary)]">
      <SearchResults
        query={query}
        category={category}
        products={products}
        totalCount={totalCount}
      />
    </div>
  )
}
