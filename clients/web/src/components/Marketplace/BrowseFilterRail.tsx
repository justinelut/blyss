'use client'

/* Hallmark · macrostructure: Catalogue (rail component) · genre: editorial
 * theme: blyss-design (light cream + burnt orange #C2410C accent)
 * states: default · hover · focus-visible · active · checked
 * contrast: pass · slop: pass (gates 1, 2, 7, 8, 24, 26, 39–45, 66)
 *
 * Reference DNA: SSENSE filter rail — type-led list, count right-flushed,
 * hairline rules between rows, no checkbox squares. Active state = bold +
 * a single hairline underline (not a coloured pill). Numerals are tabular.
 */

import { Eyebrow } from '@/design'
import { cn } from '@/lib/utils'

export interface FilterCategory {
  id: string
  name: string
  slug: string
  product_count?: number
}

export interface BrowseFilters {
  category: string | null
  min_price: number | null
  max_price: number | null
  type: 'all' | 'one_time' | 'subscription'
  /** Presentment currency (ISO, upper) — geo-resolved, e.g. 'KES' | 'USD'. */
  currency: string
  sort: 'newest' | 'trending' | 'price_asc' | 'price_desc'
}

interface BrowseFilterRailProps {
  filters: BrowseFilters
  categories: FilterCategory[]
  onChange: (next: Partial<BrowseFilters>) => void
  onClear: () => void
  /** Total active filter count for the "clear all" affordance */
  activeCount: number
}

const sortOptions: { value: BrowseFilters['sort']; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'trending', label: 'Trending' },
  { value: 'price_asc', label: 'Price ↑' },
  { value: 'price_desc', label: 'Price ↓' },
]

const typeOptions: { value: BrowseFilters['type']; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'one_time', label: 'One-time' },
  { value: 'subscription', label: 'Subscription' },
]

/**
 * BrowseFilterRail — sticky 240px filter rail for /marketplace.
 *
 * Pure presentational — URL state lives in the parent via nuqs. Each
 * change calls onChange() with the partial update.
 *
 * Editorial cadence (SSENSE-style):
 * - Each section is an Eyebrow above a list, never beside.
 * - Categories render as a type-led link list with count right-flushed and
 *   hairline rules separating each row. No checkbox squares.
 * - Type is a 3-option text link list (one column, hairline rules).
 * - Price uses an underline-on-focus hairline input (no filled pill).
 * - Currency is a quiet read-only label under Price (the header switcher
 *   owns currency selection — this rail doesn't duplicate it).
 */
export const BrowseFilterRail = ({
  filters,
  categories,
  onChange,
  onClear,
  activeCount,
}: BrowseFilterRailProps) => {
  const currencyLabel = (filters.currency || 'USD').toUpperCase()
  return (
    <aside className="flex flex-col gap-12" aria-label="Filters">
      {/* Active filters header — hairline rule below */}
      {activeCount > 0 && (
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <span className="font-sans text-[12px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {activeCount} active
          </span>
          <button
            type="button"
            onClick={onClear}
            className="font-sans text-[12px] uppercase tracking-[0.14em] text-[var(--text-secondary)] underline-offset-4 transition-colors hover:text-[var(--accent)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Sort — typographic select */}
      <div className="flex flex-col gap-3">
        <Eyebrow>Sort</Eyebrow>
        <select
          value={filters.sort}
          onChange={(e) =>
            onChange({ sort: e.target.value as BrowseFilters['sort'] })
          }
          aria-label="Sort"
          className={cn(
            'h-10 w-full appearance-none bg-transparent pr-6 font-sans text-[14px] text-[var(--text-primary)]',
            'border-0 border-b border-[var(--border)] focus:border-[var(--text-primary)]',
            'focus:outline-none focus:ring-0 transition-colors',
            "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%226%22 fill=%22none%22><path d=%22M1 1l4 4 4-4%22 stroke=%22%23594139%22 stroke-width=%221%22/></svg>')] bg-[length:10px_6px] bg-[right_4px_center] bg-no-repeat",
          )}
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Category — type-led list, hairline rules */}
      {categories.length > 0 && (
        <div className="flex flex-col gap-3">
          <Eyebrow>Category</Eyebrow>
          <ul className="-mt-1 flex flex-col">
            {/* "All" pseudo-row clears the category filter. */}
            <li>
              <button
                type="button"
                onClick={() => onChange({ category: null })}
                aria-pressed={filters.category === null}
                className={cn(
                  'group flex w-full items-baseline justify-between gap-3 border-b border-[var(--border)] py-2.5 text-left',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]',
                )}
              >
                <span
                  className={cn(
                    'font-sans text-[14px] transition-colors',
                    filters.category === null
                      ? 'font-medium text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]',
                  )}
                >
                  All categories
                </span>
              </button>
            </li>
            {categories.map((cat) => {
              const active = filters.category === cat.slug
              return (
                <li key={cat.id}>
                  <button
                    type="button"
                    onClick={() =>
                      onChange({ category: active ? null : cat.slug })
                    }
                    aria-pressed={active}
                    className={cn(
                      'group flex w-full items-baseline justify-between gap-3 border-b border-[var(--border)] py-2.5 text-left',
                      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]',
                    )}
                  >
                    <span
                      className={cn(
                        'font-sans text-[14px] transition-colors',
                        active
                          ? 'font-medium text-[var(--text-primary)] underline underline-offset-4 decoration-[var(--accent)]'
                          : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]',
                      )}
                    >
                      {cat.name}
                    </span>
                    {cat.product_count !== undefined && (
                      <span
                        className="font-sans text-[12px] tabular-nums text-[var(--text-muted)]"
                        aria-label={`${cat.product_count} products`}
                      >
                        {cat.product_count}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Type — 3-option list (replaces radio buttons) */}
      <div className="flex flex-col gap-3">
        <Eyebrow>Type</Eyebrow>
        <ul className="-mt-1 flex flex-col">
          {typeOptions.map((opt) => {
            const active = filters.type === opt.value
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  onClick={() => onChange({ type: opt.value })}
                  aria-pressed={active}
                  className={cn(
                    'group flex w-full items-baseline justify-between gap-3 border-b border-[var(--border)] py-2.5 text-left',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]',
                  )}
                >
                  <span
                    className={cn(
                      'font-sans text-[14px] transition-colors',
                      active
                        ? 'font-medium text-[var(--text-primary)] underline underline-offset-4 decoration-[var(--accent)]'
                        : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]',
                    )}
                  >
                    {opt.label}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Price — hairline-underline inputs, no filled pill */}
      <div className="flex flex-col gap-3">
        <Eyebrow>Price ({currencyLabel})</Eyebrow>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="rail-min-price"
              className="font-sans text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]"
            >
              Min
            </label>
            <input
              id="rail-min-price"
              type="number"
              inputMode="numeric"
              min={0}
              value={filters.min_price ?? ''}
              onChange={(e) =>
                onChange({
                  min_price: e.target.value
                    ? parseInt(e.target.value, 10)
                    : null,
                })
              }
              placeholder="0"
              className={cn(
                'h-9 w-full bg-transparent pr-1 font-sans text-[14px] tabular-nums text-[var(--text-primary)]',
                'placeholder:text-[var(--text-muted)]',
                'border-0 border-b border-[var(--border)] focus:border-[var(--text-primary)]',
                'focus:outline-none focus:ring-0 transition-colors',
              )}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="rail-max-price"
              className="font-sans text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]"
            >
              Max
            </label>
            <input
              id="rail-max-price"
              type="number"
              inputMode="numeric"
              min={0}
              value={filters.max_price ?? ''}
              onChange={(e) =>
                onChange({
                  max_price: e.target.value
                    ? parseInt(e.target.value, 10)
                    : null,
                })
              }
              placeholder="—"
              className={cn(
                'h-9 w-full bg-transparent pr-1 font-sans text-[14px] tabular-nums text-[var(--text-primary)]',
                'placeholder:text-[var(--text-muted)]',
                'border-0 border-b border-[var(--border)] focus:border-[var(--text-primary)]',
                'focus:outline-none focus:ring-0 transition-colors',
              )}
            />
          </div>
        </div>
      </div>

      {/* Currency — quiet read-only label. The header CountrySwitcher owns
          currency selection; the rail doesn't duplicate that control. */}
      <div className="flex flex-col gap-2">
        <Eyebrow>Currency</Eyebrow>
        <p className="font-sans text-[13px] text-[var(--text-secondary)]">
          Showing prices in{' '}
          <span className="font-medium text-[var(--text-primary)]">
            {currencyLabel}
          </span>
          . Switch in the header to see other regions.
        </p>
      </div>
    </aside>
  )
}
