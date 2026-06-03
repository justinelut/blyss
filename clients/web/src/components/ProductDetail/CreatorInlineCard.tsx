import Link from 'next/link'
import { OptimizedImage } from '@/components/Image/OptimizedImage'
import { FiArrowUpRight } from 'react-icons/fi'
import { cn } from '@/lib/utils'
import { Eyebrow, typography } from '@/design'

export interface CreatorInlineCardProps {
  name: string
  slug: string
  avatarUrl?: string | null
  bio?: string | null
  productCount?: number
  className?: string
}

/**
 * CreatorInlineCard — the handoff back to the creator's universe (per plan
 * §6.5 step 5). Editorial, surface-sunken card sitting under the price /
 * benefits column.
 *
 * Visual rhythm:
 *
 *   ┌──────────────────────────────────────────────┐
 *   │  CREATOR                                     │
 *   │  ─────────────────                           │
 *   │  ┌────┐  Maya Wanjiru                        │
 *   │  │ MW │  @maya-wanjiru · 12 products         │
 *   │  └────┘                                      │
 *   │  Bio body, two lines, --text-secondary…      │
 *   │  ─────────────────                           │
 *   │  Visit storefront ->                         │
 *   └──────────────────────────────────────────────┘
 *
 * The CTA uses an outward-arrow icon to signal "this leaves the product
 * page" — matching the marketplace cards system (`FiArrowUpRight` at the
 * exit, `FiArrowRight` for in-flow continuation).
 */
export const CreatorInlineCard = ({
  name,
  slug,
  avatarUrl,
  bio,
  productCount,
  className,
}: CreatorInlineCardProps) => {
  return (
    <aside
      aria-label={`About ${name}`}
      className={cn(
        'rounded-md bg-[var(--surface-sunken)] p-6 md:p-8',
        className,
      )}
    >
      <Eyebrow>Creator</Eyebrow>

      <div className="mt-4 flex items-start gap-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[var(--surface)] ring-1 ring-[var(--border)]">
          <OptimizedImage
            src={avatarUrl}
            alt={`${name} avatar`}
            fill
            sizes="56px"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              typography.h4,
              'truncate text-[var(--text-primary)]',
            )}
          >
            {name}
          </h3>
          <p className="mt-1 font-sans text-[13px] text-[var(--text-muted)] tabular-nums">
            <span className="text-[var(--text-secondary)]">@{slug}</span>
            {typeof productCount === 'number' && (
              <>
                <span aria-hidden="true" className="mx-1.5">
                  ·
                </span>
                {productCount} {productCount === 1 ? 'product' : 'products'}
              </>
            )}
          </p>
        </div>
      </div>

      {bio && (
        <p className="mt-5 line-clamp-3 font-sans text-[14px] leading-[1.55] text-[var(--text-secondary)]">
          {bio}
        </p>
      )}

      <div className="mt-6 border-t border-[var(--border)] pt-4">
        <Link
          href={`/creators/${slug}`}
          prefetch
          className="group inline-flex items-center gap-1.5 font-sans text-[14px] font-medium text-[var(--accent)] underline-offset-4 transition-colors hover:underline"
        >
          Visit storefront
          <FiArrowUpRight
            size={14}
            className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden="true"
          />
        </Link>
      </div>
    </aside>
  )
}
