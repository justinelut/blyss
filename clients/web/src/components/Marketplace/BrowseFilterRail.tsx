'use client'

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
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
]

/**
 * BrowseFilterRail — sticky 240px filter rail for /marketplace.
 *
 * Per plan §6.2: Category checkboxes · Price range (min/max with tabular
 * numerals) · Type radio · Currency pill toggle · Sort select.
 *
 * Pure presentational — URL state lives in the parent via nuqs. Each
 * change calls onChange() with the partial update.
 */
export const BrowseFilterRail = ({
  filters,
  categories,
  onChange,
  onClear,
  activeCount,
}: BrowseFilterRailProps) => {
  return (
    <aside
      className="flex flex-col gap-10"
      aria-label="Filters"
    >
      {/* Active filters header */}
      {activeCount > 0 && (
        <div className="flex items-center justify-between">
          <span className="font-sans text-[13px] text-[var(--text-muted)]">
            {activeCount} active
          </span>
          <button
            type="button"
            onClick={onClear}
            className="font-sans text-[13px] text-[var(--accent)] underline-offset-4 transition-colors hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Sort */}
      <div className="flex flex-col gap-3">
        <Eyebrow>Sort</Eyebrow>
        <select
          value={filters.sort}
          onChange={(e) =>
            onChange({ sort: e.target.value as BrowseFilters['sort'] })
          }
          className={cn(
            'h-11 w-full rounded-md bg-[var(--surface-sunken)] px-3 font-sans text-[14px] text-[var(--text-primary)]',
            'focus:outline-none focus:ring-0',
            'border-0 border-b-2 border-transparent focus:border-[var(--accent)] transition-colors',
          )}
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Category */}
      {categories.length > 0 && (
        <div className="flex flex-col gap-3">
          <Eyebrow>Category</Eyebrow>
          <ul className="flex flex-col gap-2.5">
            {categories.map((cat) => {
              const checked = filters.category === cat.slug
              return (
                <li key={cat.id}>
                  <label className="group flex cursor-pointer items-center justify-between gap-3 py-1">
                    <span className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          onChange({ category: checked ? null : cat.slug })
                        }
                        className="h-4 w-4 rounded-sm border-[var(--border-strong)] bg-[var(--surface-sunken)] text-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] focus:ring-offset-0"
                      />
                      <span
                        className={cn(
                          'font-sans text-[14px] transition-colors',
                          checked
                            ? 'text-[var(--text-primary)]'
                            : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]',
                        )}
                      >
                        {cat.name}
                      </span>
                    </span>
                    {cat.product_count !== undefined && (
                      <span className="font-sans text-[12px] tabular-nums text-[var(--text-muted)]">
                        {cat.product_count}
                      </span>
                    )}
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Type */}
      <div className="flex flex-col gap-3">
        <Eyebrow>Type</Eyebrow>
        <div className="flex flex-col gap-2">
          {(['all', 'one_time', 'subscription'] as const).map((t) => {
            const label = t === 'all' ? 'All' : t === 'one_time' ? 'One-time purchase' : 'Subscription'
            return (
              <label key={t} className="flex cursor-pointer items-center gap-3 py-1">
                <input
                  type="radio"
                  name="type"
                  checked={filters.type === t}
                  onChange={() => onChange({ type: t })}
                  className="h-4 w-4 border-[var(--border-strong)] bg-[var(--surface-sunken)] text-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] focus:ring-offset-0"
                />
                <span className="font-sans text-[14px] text-[var(--text-secondary)]">
                  {label}
                </span>
              </label>
            )
          })}
        </div>
      </div>

      {/* Price */}
      <div className="flex flex-col gap-3">
        <Eyebrow>Price ({filters.currency})</Eyebrow>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="mb-1 block font-sans text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              Min
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={filters.min_price ?? ''}
              onChange={(e) =>
                onChange({
                  min_price: e.target.value ? parseInt(e.target.value, 10) : null,
                })
              }
              placeholder="0"
              className={cn(
                'h-10 w-full rounded-md bg-[var(--surface-sunken)] px-3 font-sans text-[14px] tabular-nums text-[var(--text-primary)]',
                'placeholder:text-[var(--text-muted)]',
                'focus:outline-none focus:ring-0',
                'border-0 border-b-2 border-transparent focus:border-[var(--accent)] transition-colors',
              )}
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block font-sans text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              Max
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={filters.max_price ?? ''}
              onChange={(e) =>
                onChange({
                  max_price: e.target.value ? parseInt(e.target.value, 10) : null,
                })
              }
              placeholder="—"
              className={cn(
                'h-10 w-full rounded-md bg-[var(--surface-sunken)] px-3 font-sans text-[14px] tabular-nums text-[var(--text-primary)]',
                'placeholder:text-[var(--text-muted)]',
                'focus:outline-none focus:ring-0',
                'border-0 border-b-2 border-transparent focus:border-[var(--accent)] transition-colors',
              )}
            />
          </div>
        </div>
      </div>

      {/* Currency */}
      <div className="flex flex-col gap-3">
        <Eyebrow>Currency</Eyebrow>
        <div
          role="group"
          aria-label="Currency"
          className="inline-flex h-10 items-center gap-1 rounded-md bg-[var(--surface-sunken)] p-1"
        >
          {(['KES', 'USD'] as const).map((cur) => {
            const active = filters.currency === cur
            return (
              <button
                key={cur}
                type="button"
                onClick={() => onChange({ currency: cur })}
                aria-pressed={active}
                className={cn(
                  'flex flex-1 items-center justify-center rounded-sm px-3 py-1 font-sans text-[13px] font-medium transition-colors',
                  active
                    ? 'bg-[var(--surface-elevated)] text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                )}
              >
                {cur}
              </button>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
