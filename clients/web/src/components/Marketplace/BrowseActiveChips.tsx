'use client'

import { FiX } from 'react-icons/fi'
import type { BrowseFilters, FilterCategory } from './BrowseFilterRail'
import { cn } from '@/lib/utils'

interface BrowseActiveChipsProps {
  filters: BrowseFilters
  categories: FilterCategory[]
  onChange: (next: Partial<BrowseFilters>) => void
  className?: string
}

/**
 * BrowseActiveChips — chip row showing currently active filters.
 *
 * Per plan §6.2: each active filter renders as a removable chip below the
 * search bar. Tapping the X removes that filter. Visible on all viewports
 * (gives mobile users a quick filter-remove path without opening the sheet).
 */
export const BrowseActiveChips = ({
  filters,
  categories,
  onChange,
  className,
}: BrowseActiveChipsProps) => {
  const categoryLabel = filters.category
    ? categories.find((c) => c.slug === filters.category)?.name ?? filters.category
    : null

  const chips: { label: string; onRemove: () => void }[] = []

  if (categoryLabel) {
    chips.push({ label: categoryLabel, onRemove: () => onChange({ category: null }) })
  }
  if (filters.type !== 'all') {
    const t =
      filters.type === 'subscription' ? 'Subscriptions' : 'One-time'
    chips.push({ label: t, onRemove: () => onChange({ type: 'all' }) })
  }
  if (filters.min_price != null || filters.max_price != null) {
    const lo = filters.min_price ?? 0
    const hi = filters.max_price ?? '—'
    chips.push({
      label: `${filters.currency} ${lo}–${hi}`,
      onRemove: () => onChange({ min_price: null, max_price: null }),
    })
  }
  if (filters.sort !== 'newest') {
    const labels: Record<BrowseFilters['sort'], string> = {
      newest: 'Newest',
      trending: 'Trending',
      price_asc: 'Price ↑',
      price_desc: 'Price ↓',
    }
    chips.push({
      label: labels[filters.sort],
      onRemove: () => onChange({ sort: 'newest' }),
    })
  }

  if (chips.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-2', className)} aria-label="Active filters">
      {chips.map((chip) => (
        <button
          key={chip.label}
          type="button"
          onClick={chip.onRemove}
          aria-label={`Remove filter: ${chip.label}`}
          className={cn(
            'group inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-sunken)] px-3 py-1.5',
            'font-sans text-[13px] text-[var(--text-primary)]',
            'transition-colors hover:bg-[var(--surface)]',
          )}
        >
          {chip.label}
          <FiX
            size={14}
            className="text-[var(--text-muted)] transition-colors group-hover:text-[var(--accent)]"
          />
        </button>
      ))}
    </div>
  )
}
