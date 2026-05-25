'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
  useQueryStates,
} from 'nuqs'
import { schemas } from '@/lib/api'
import { usePublicProducts } from '@/hooks/queries/products'
import { initPerformanceMonitoring } from '@/utils/performance'
import {
  BrowseFilterRail,
  type BrowseFilters,
  type FilterCategory,
} from '@/components/Marketplace/BrowseFilterRail'
import { BrowseGrid } from '@/components/Marketplace/BrowseGrid'
import { BrowseSearchBar } from '@/components/Marketplace/BrowseSearchBar'
import { BrowseEmptyState } from '@/components/Marketplace/BrowseEmptyState'
import { BrowseActiveChips } from '@/components/Marketplace/BrowseActiveChips'
import {
  BrowseMobileFilters,
  BrowseMobileFiltersTrigger,
} from '@/components/Marketplace/BrowseMobileFilters'
import { Eyebrow, typography, PageEnter } from '@/design'
import { cn } from '@/lib/utils'

interface BrowsePageProps {
  initialProducts: schemas['Product'][]
  initialTotalCount: number
  categories: FilterCategory[]
  initialFilters: {
    search: string | null
    category: string | null
    min_price: number | null
    max_price: number | null
    type: BrowseFilters['type']
    currency: BrowseFilters['currency']
    sort: BrowseFilters['sort']
    page: number
  }
}

const filterParsers = {
  search: parseAsString,
  category: parseAsString,
  min_price: parseAsInteger,
  max_price: parseAsInteger,
  type: parseAsStringEnum<BrowseFilters['type']>([
    'all',
    'one_time',
    'subscription',
  ]).withDefault('all'),
  currency: parseAsStringEnum<BrowseFilters['currency']>([
    'KES',
    'USD',
  ]).withDefault('KES'),
  sort: parseAsStringEnum<BrowseFilters['sort']>([
    'newest',
    'trending',
    'price_asc',
    'price_desc',
  ]).withDefault('newest'),
  page: parseAsInteger.withDefault(1),
}

/**
 * BrowsePage — client wrapper for /marketplace.
 *
 * Owns filter state via nuqs (URL-driven). Hydrates from server-rendered
 * initialProducts on first load; subsequent filter changes refetch via
 * TanStack Query. No useEffect chains — filter changes flip URL state which
 * the query hook subscribes to.
 *
 * Per plan §6.2:
 * - Two-column layout on desktop (240px filter rail + grid)
 * - Single column on mobile with bottom-sheet filters
 * - URL state via nuqs
 * - Sticky search bar at top of right column
 * - Chip row showing active filters with X to remove each
 */
export function BrowsePage({
  initialProducts,
  initialTotalCount,
  categories,
  initialFilters,
}: BrowsePageProps) {
  const [filters, setFilters] = useQueryStates(filterParsers, {
    history: 'push',
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  // Initialize web-vitals reporting
  useEffect(() => {
    initPerformanceMonitoring()
  }, [])

  // Bootstrap URL state from server props on first render if URL is empty
  useEffect(() => {
    const isEmpty =
      filters.search === null &&
      filters.category === null &&
      filters.min_price === null &&
      filters.max_price === null &&
      filters.type === 'all' &&
      filters.sort === 'newest' &&
      filters.page === 1
    if (!isEmpty) return
    setFilters(
      {
        search: initialFilters.search,
        category: initialFilters.category,
        min_price: initialFilters.min_price,
        max_price: initialFilters.max_price,
        type: initialFilters.type,
        currency: initialFilters.currency,
        sort: initialFilters.sort,
        page: initialFilters.page,
      },
      { history: 'replace' },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const browseFilters: BrowseFilters = useMemo(
    () => ({
      category: filters.category,
      min_price: filters.min_price,
      max_price: filters.max_price,
      type: filters.type,
      currency: filters.currency,
      sort: filters.sort,
    }),
    [filters],
  )

  const activeCount = useMemo(() => {
    let n = 0
    if (filters.category) n++
    if (filters.type !== 'all') n++
    if (filters.min_price != null || filters.max_price != null) n++
    if (filters.sort !== 'newest') n++
    if (filters.search) n++
    return n
  }, [filters])

  // Fetch products via TanStack Query — hydrated by initialProducts on first render
  const { data, isLoading, isFetching } = usePublicProducts({
    search: filters.search || undefined,
    category: filters.category || undefined,
    minPrice: filters.min_price || undefined,
    maxPrice: filters.max_price || undefined,
    sort:
      filters.sort === 'trending'
        ? 'newest' // backend doesn't support 'trending' yet — alias to newest
        : filters.sort,
    page: filters.page,
  })

  const products = data?.items ?? initialProducts
  const totalCount = data?.pagination?.total_count ?? initialTotalCount

  const updateFilters = (next: Partial<BrowseFilters & { search: string | null; page: number }>) => {
    setFilters({ ...next, page: 1 } as any)
  }

  const clearAll = () => {
    setFilters({
      search: null,
      category: null,
      min_price: null,
      max_price: null,
      type: 'all',
      currency: 'KES',
      sort: 'newest',
      page: 1,
    })
  }

  const showEmpty = !isLoading && products.length === 0

  return (
    <div className="bg-[var(--background)] text-[var(--text-primary)]">
      {/* Page hero — small, no full-bleed image (this is a serious shopper page) */}
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto max-w-[1280px] px-6 py-12 md:px-16 md:py-16">
          <PageEnter>
            <Eyebrow>The marketplace</Eyebrow>
            <h1 className={cn(typography.h1, 'mt-4 max-w-[18ch] text-[var(--text-primary)]')}>
              Find your next thing.
            </h1>
          </PageEnter>
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] px-6 py-10 md:px-16 md:py-12">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[240px_1fr] lg:gap-16">
          {/* Filter rail — desktop only */}
          <div className="hidden lg:block">
            <div className="sticky top-28">
              <BrowseFilterRail
                filters={browseFilters}
                categories={categories}
                onChange={updateFilters}
                onClear={clearAll}
                activeCount={activeCount}
              />
            </div>
          </div>

          {/* Right column */}
          <div className="flex min-w-0 flex-col gap-6">
            {/* Search row */}
            <div className="flex items-center gap-3">
              <BrowseSearchBar
                value={filters.search ?? ''}
                onChange={(v) =>
                  setFilters({ search: v || null, page: 1 })
                }
              />
              {/* Mobile filters trigger */}
              <BrowseMobileFiltersTrigger
                onClick={() => setMobileOpen(true)}
                activeCount={activeCount}
                className="lg:hidden"
              />
            </div>

            {/* Active filter chips */}
            <BrowseActiveChips
              filters={browseFilters}
              categories={categories}
              onChange={updateFilters}
            />

            {/* Result count */}
            <div className="flex items-center justify-between">
              <p className="font-sans text-[13px] text-[var(--text-muted)]">
                {isLoading
                  ? 'Loading…'
                  : `${totalCount.toLocaleString()} ${totalCount === 1 ? 'product' : 'products'}`}
              </p>
            </div>

            {/* Grid / empty / loading */}
            {showEmpty ? (
              <BrowseEmptyState
                hasFilters={activeCount > 0}
                onClear={activeCount > 0 ? clearAll : undefined}
              />
            ) : (
              <BrowseGrid
                products={products}
                isLoading={isLoading || isFetching}
              />
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter sheet (rendered at root for stacking context) */}
      <BrowseMobileFilters
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        filters={browseFilters}
        categories={categories}
        onChange={updateFilters}
        onClear={clearAll}
        activeCount={activeCount}
      />
    </div>
  )
}
