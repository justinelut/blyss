import Link from './LocaleLink'
import { Eyebrow, SectionDivider, typography } from '@/design'
import { OptimizedImage } from '@/components/Image/OptimizedImage'
import { cn } from '@/lib/utils'

export interface CategoryTile {
  id: string
  name: string
  slug: string
  /** Optional cover image URL */
  cover_image_url?: string | null
  /** Number of products in this category, for the metadata line */
  product_count?: number
}

interface BrowseByCraftProps {
  categories: CategoryTile[]
}

/**
 * BrowseByCraft — 6 category tiles (3×2 desktop, 2×3 tablet).
 *
 * Two render modes:
 * - Image present  → cover photo + warm scrim + white label, anchored bottom-left
 * - Image absent   → editorial typographic tile (numbered, on --surface-elevated)
 *                    so the section never reads as empty grey blocks
 *
 * Per plan §3.4 imagery: Blyss does NOT commission stock — the typographic mode
 * is the on-brand fallback until creators contribute category covers.
 */
export const BrowseByCraft = ({ categories }: BrowseByCraftProps) => {
  if (!categories?.length) return null

  return (
    <SectionDivider tone="sunken" density="lg">
      <div className="mb-10">
        <Eyebrow>Browse by craft</Eyebrow>
        <h2 className={cn(typography.h2, 'mt-3 text-[var(--text-primary)]')}>
          Pick your lane.
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        {categories.slice(0, 6).map((category, i) => {
          const hasImage = !!category.cover_image_url
          return (
            <Link
              key={category.id}
              href={`/marketplace?category=${category.slug}`}
              className={cn(
                'group relative aspect-square overflow-hidden rounded-md',
                hasImage
                  ? 'bg-[var(--surface)]'
                  : 'bg-[var(--surface-elevated)] transition-colors hover:bg-[var(--background)]',
              )}
            >
              {hasImage ? (
                <>
                  <OptimizedImage
                    src={category.cover_image_url!}
                    alt={`${category.name} category`}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="opacity-90 transition-opacity group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-[rgba(26,26,23,0.32)]" />
                  <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-6">
                    <h3 className="font-display text-[20px] font-medium tracking-tight text-white md:text-[24px]">
                      {category.name}
                    </h3>
                    {category.product_count !== undefined && (
                      <p className="mt-1 font-sans text-[12px] uppercase tracking-[0.14em] text-white/80">
                        {category.product_count}{' '}
                        {category.product_count === 1 ? 'item' : 'items'}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                /* Editorial typographic tile — numbered, no image */
                <div className="absolute inset-0 flex flex-col justify-between p-5 md:p-6">
                  <span
                    aria-hidden
                    className="font-display text-[40px] font-light leading-none tabular-nums text-[var(--text-muted)] md:text-[56px]"
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="font-display text-[24px] font-medium leading-tight tracking-[-0.01em] text-[var(--text-primary)] md:text-[30px] transition-colors group-hover:text-[var(--accent)]">
                      {category.name}
                    </h3>
                    {category.product_count !== undefined && (
                      <p className="mt-2 font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                        {category.product_count}{' '}
                        {category.product_count === 1 ? 'item' : 'items'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </SectionDivider>
  )
}
