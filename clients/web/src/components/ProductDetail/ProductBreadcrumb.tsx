import Link from '@/components/Marketplace/LocaleLink'
import { FiChevronRight } from 'react-icons/fi'
import { cn } from '@/lib/utils'

export interface BreadcrumbCrumb {
  /** Display label */
  label: string
  /** Link target — omit for the last (current) crumb */
  href?: string
}

export interface ProductBreadcrumbProps {
  crumbs: BreadcrumbCrumb[]
  className?: string
}

/**
 * ProductBreadcrumb — `Browse > {category} > {product name}` per plan §6.5.
 *
 * Inter 13px muted, accent on the last (current) segment. No background, no
 * separator dots — just text + chevron, the editorial pattern from Mr Porter
 * PDPs.
 *
 * Renders as <nav aria-label="Breadcrumb"> with an ordered list per WAI-ARIA
 * authoring practices for breadcrumb navigation.
 */
export const ProductBreadcrumb = ({ crumbs, className }: ProductBreadcrumbProps) => {
  if (!crumbs.length) return null

  return (
    <nav aria-label="Breadcrumb" className={cn('w-full', className)}>
      <ol className="flex flex-wrap items-center gap-1.5 font-sans text-[13px] text-[var(--text-muted)]">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1
          return (
            <li key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
              {crumb.href && !isLast ? (
                <Link
                  href={crumb.href}
                  className="text-[var(--text-secondary)] underline-offset-4 transition-colors hover:text-[var(--accent)] hover:underline"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={cn(
                    'truncate',
                    isLast
                      ? 'text-[var(--accent)]'
                      : 'text-[var(--text-secondary)]',
                  )}
                >
                  {crumb.label}
                </span>
              )}
              {!isLast && (
                <FiChevronRight
                  size={14}
                  className="text-[var(--text-muted)]"
                  aria-hidden="true"
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
