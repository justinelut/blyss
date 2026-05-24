import Link from 'next/link'
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
 * Per plan §6.1 step 4. Each tile is --surface-sunken background with a 1:1
 * aspect ratio, category name in Inter Display 500 24px, and item count.
 * On hover the tile brightens to --surface-elevated.
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
        {categories.slice(0, 6).map((category) => (
          <Link
            key={category.id}
            href={`/marketplace?category=${category.slug}`}
            className={cn(
              'group relative aspect-square overflow-hidden rounded-md',
              'bg-[var(--surface-elevated)] transition-colors',
              'hover:bg-[var(--surface)]',
            )}
          >
            {/* Cover image (if any) */}
            {category.cover_image_url && (
              <OptimizedImage
                src={category.cover_image_url}
                alt={`${category.name} category`}
                fill
                sizes="(max-width: 768px) 50vw, 33vw"
                className="opacity-90 transition-opacity group-hover:opacity-100"
              />
            )}

            {/* Subtle warm overlay so the text is always readable */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(26,26,23,0.18)] to-transparent" />

            {/* Label */}
            <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-6">
              <h3
                className={cn(
                  'font-display text-[20px] font-medium tracking-tight md:text-[24px]',
                  category.cover_image_url ? 'text-white' : 'text-[var(--text-primary)]',
                )}
              >
                {category.name}
              </h3>
              {category.product_count !== undefined && (
                <p
                  className={cn(
                    'mt-1 font-sans text-[12px] uppercase tracking-[0.14em]',
                    category.cover_image_url
                      ? 'text-white/75'
                      : 'text-[var(--text-muted)]',
                  )}
                >
                  {category.product_count} {category.product_count === 1 ? 'item' : 'items'}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </SectionDivider>
  )
}
