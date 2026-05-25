'use client'

import { schemas } from '@/lib/api'
import { MarketplaceProductCard } from '@/components/Marketplace/MarketplaceProductCard'
import { typography } from '@/design'
import { cn } from '@/lib/utils'

export interface AllWorkTabProps {
  /** All non-archived, non-subscription products by this creator. */
  products: schemas['Product'][]
  /** The creator's name — used in the empty-state copy */
  creatorName: string
}

/**
 * AllWorkTab — the canonical "all products" view of a creator's catalog.
 *
 * Per plan/07-pages.md §6.4 step 3:
 * - 4-column masonry grid of all their products (4 / 3 / 2 / 1 by viewport)
 * - Each card uses the existing MarketplaceProductCard with hideCreator (we
 *   don't repeat the creator's name on every card — they're already on the
 *   hero above)
 * - 4:5 image aspect, no add-to-cart on the card (decision happens on PDP)
 *
 * Empty state: editorial copy, no cartoon. Per §15.4 + §3.5.
 */
export const AllWorkTab = ({ products, creatorName }: AllWorkTabProps) => {
  if (!products.length) {
    return (
      <section className="mx-auto max-w-[1280px] px-6 py-16 md:px-16 md:py-24">
        <div className="max-w-[44ch]">
          <h2 className={cn(typography.h3, 'text-[var(--text-primary)]')}>
            {creatorName} hasn&rsquo;t published anything yet.
          </h2>
          <p
            className={cn(
              typography.body,
              'mt-4 text-[var(--text-secondary)]',
            )}
          >
            New work lands here as soon as it&rsquo;s ready. Check back soon, or
            browse other Kenyan creators while you wait.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-[1280px] px-6 py-12 md:px-16 md:py-16">
      <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <MarketplaceProductCard
            key={product.id}
            product={product}
            hideCreator
          />
        ))}
      </div>
    </section>
  )
}
