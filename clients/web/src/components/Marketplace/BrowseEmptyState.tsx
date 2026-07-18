import Link from './LocaleLink'
import { typography } from '@/design'
import { cn } from '@/lib/utils'

interface BrowseEmptyStateProps {
  /** Whether the user has any active filters (changes the copy + CTA) */
  hasFilters: boolean
  /** Called when user clicks "Clear filters" */
  onClear?: () => void
}

/**
 * BrowseEmptyState — editorial empty state for /marketplace.
 *
 * Per plan §3.4 + §6.2: editorial copy, no cartoons, no animated emoji,
 * single primary CTA. Two variants:
 * - hasFilters=true: "no products match" + clear-filters action
 * - hasFilters=false: "marketplace coming soon" + become-a-creator CTA
 */
export const BrowseEmptyState = ({ hasFilters, onClear }: BrowseEmptyStateProps) => {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-start py-20 max-w-[40ch]">
        <h2 className={cn(typography.h3, 'text-[var(--text-primary)]')}>
          No products match these filters yet.
        </h2>
        <p className={cn(typography.body, 'mt-4 text-[var(--text-secondary)]')}>
          Try widening your price range or clearing a category. New work is added every week — the catalogue keeps growing.
        </p>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="mt-8 inline-flex h-11 items-center justify-center rounded-md bg-[var(--accent)] px-6 font-sans text-[14px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            Clear filters
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start py-24 max-w-[44ch]">
      <h2 className={cn(typography.h3, 'text-[var(--text-primary)]')}>
        The marketplace is just getting started.
      </h2>
      <p className={cn(typography.body, 'mt-4 text-[var(--text-secondary)]')}>
        We&rsquo;re onboarding the first wave of independent creators now. Check back tomorrow — or jump in and become one yourself.
      </p>
      <Link
        href="/start"
        className="mt-8 inline-flex h-11 items-center justify-center rounded-md bg-[var(--accent)] px-6 font-sans text-[14px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
      >
        Become a creator
      </Link>
    </div>
  )
}
