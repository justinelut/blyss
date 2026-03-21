import { BrowseMarketplace } from '@/components/Browse/BrowseMarketplace'
import { getServerSideAPI } from '@/utils/client/serverside'
import { unwrap } from '@/lib/api'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Search Marketplace | Blyss',
  description: 'Discover curated digital assets from Kenyan creators',
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const api = await getServerSideAPI()

  const search = typeof params.search === 'string' ? params.search : undefined
  const category = typeof params.category === 'string' ? params.category : undefined

  try {
    const products = await unwrap(
      api.GET('/v1/products', {
        params: {
          query: {
            q: search,
            limit: 100,
          },
        },
      }),
    )

    return (
      <BrowseMarketplace
        initialProducts={products.items || []}
        initialSearch={search}
        initialCategory={category}
      />
    )
  } catch {
    return <BrowseMarketplace initialProducts={[]} />
  }
}
