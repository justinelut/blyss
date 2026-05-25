'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/utils/client'
import { unwrap, schemas } from '@/lib/api'
import { Eyebrow, typography } from '@/design'
import { MarketplaceProductCard } from '@/components/Marketplace/MarketplaceProductCard'
import { cn } from '@/lib/utils'

interface RelatedProductsProps {
  productId: string
  className?: string
}

/**
 * RelatedProducts — 4 cards from /v1/products/{id}/related per §6.5 step 6.
 */
export const RelatedProducts = ({ productId, className }: RelatedProductsProps) => {
  const { data } = useQuery({
    queryKey: ['products', productId, 'related'],
    queryFn: () =>
      unwrap(
        api.GET('/v1/products/{id}/related', {
          params: { path: { id: productId }, query: { limit: 4 } },
        }),
      ),
    staleTime: 60_000,
  })

  const items = (data?.items ?? []) as schemas['Product'][]
  if (!items.length) return null

  return (
    <section className={cn('', className)}>
      <Eyebrow>You might also like</Eyebrow>
      <h2 className={cn(typography.h3, 'mt-3 text-[var(--text-primary)]')}>
        Related products
      </h2>
      <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((p) => (
          <MarketplaceProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  )
}
