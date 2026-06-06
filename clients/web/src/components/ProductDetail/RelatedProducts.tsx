'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { FiArrowRight } from 'react-icons/fi'
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
 * RelatedProducts — up to 4 related cards from /v1/products/{id}/related
 * (per plan §6.5 step 6). The section follows the marketplace's editorial
 * card system: hairline rule above, eyebrow + display headline, tight
 * tabular count, four-up grid of MarketplaceProductCards, then a "View
 * more" exit link to /marketplace so the user has a clear way out.
 *
 * Skipped entirely (returns null) when the API has no related items, so
 * the page never closes on a stranded heading + empty grid.
 */
export const RelatedProducts = ({
  productId,
  className,
}: RelatedProductsProps) => {
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
    <section
      aria-labelledby="related-products-heading"
      className={cn('border-t border-[var(--border)] pt-12 md:pt-16', className)}
    >
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-6">
        <div>
          <Eyebrow>You might also like</Eyebrow>
          <h2
            id="related-products-heading"
            className={cn(
              typography.h3,
              'mt-3 max-w-[28ch] text-[var(--text-primary)]',
            )}
          >
            Hand-picked next reads.
          </h2>
        </div>
        <Link
          href="/marketplace"
          prefetch
          className="group inline-flex items-center gap-2 self-start font-sans text-[14px] text-[var(--text-secondary)] underline-offset-4 transition-colors hover:text-[var(--accent)] hover:underline md:self-end"
        >
          Browse the full marketplace
          <FiArrowRight
            size={14}
            className="transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      </header>

      <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-6 sm:gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((p) => (
          <MarketplaceProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  )
}
