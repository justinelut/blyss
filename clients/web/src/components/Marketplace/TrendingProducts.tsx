import Link from './LocaleLink'
import { schemas } from '@/lib/api'
import { Eyebrow, SectionDivider, typography } from '@/design'
import { MarketplaceProductCard } from './MarketplaceProductCard'
import { cn } from '@/lib/utils'

interface TrendingProductsProps {
  products: schemas['Product'][]
  /** Override the eyebrow text */
  eyebrow?: string
  /** Override the heading */
  heading?: string
  /** Optional "View all" link target */
  viewAllHref?: string
}

/**
 * TrendingProducts — 8-card grid (4×2 desktop / 2×4 tablet / 1-col mobile).
 *
 * Per plan §6.1 step 3: pulled from /v1/products/public?sort=trending&limit=8.
 * Card uses §3.4 imagery rules. No "Add to cart" on the card.
 */
export const TrendingProducts = ({
  products,
  eyebrow = "What's selling",
  heading = 'Trending now',
  viewAllHref = '/marketplace?sort=trending',
}: TrendingProductsProps) => {
  if (!products?.length) return null

  return (
    <SectionDivider tone="default" density="lg">
      <div className="mb-12 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 className={cn(typography.h2, 'mt-3 text-[var(--text-primary)]')}>
            {heading}
          </h2>
        </div>
        <Link
          href={viewAllHref}
          className="font-sans text-sm text-[var(--text-secondary)] underline-offset-4 transition-colors hover:text-[var(--accent)] hover:underline"
        >
          See all →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-6 sm:gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
        {products.slice(0, 8).map((product) => (
          <MarketplaceProductCard key={product.id} product={product} />
        ))}
      </div>
    </SectionDivider>
  )
}
