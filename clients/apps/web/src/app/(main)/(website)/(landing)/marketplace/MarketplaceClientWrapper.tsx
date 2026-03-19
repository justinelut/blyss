'use client'

import { usePublicProducts } from '@/hooks/queries/products'
import { schemas } from '@polar-sh/client'
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs'
import { useCallback, useEffect } from 'react'
import { MarketplaceContent } from './MarketplaceContent'

const filterParsers = {
  search: parseAsString,
  category: parseAsString,
  min_price: parseAsInteger,
  max_price: parseAsInteger,
  sort: parseAsString.withDefault('newest'),
  page: parseAsInteger.withDefault(1),
}

interface MarketplaceClientWrapperProps {
  initialProducts: schemas['Product'][]
  initialTotalCount: number
  initialTotalPages: number
  initialFeaturedProducts: schemas['Product'][]
  initialFilters: {
    search: string | null
    category: string | null
    min_price: number | null
    max_price: number | null
    sort: string | null
    page: number | null
  }
}

export function MarketplaceClientWrapper({
  initialProducts,
  initialTotalCount,
  initialTotalPages,
  initialFeaturedProducts,
  initialFilters,
}: MarketplaceClientWrapperProps) {
  const [filters, setFilters] = useQueryStates(filterParsers, {
    history: 'push',
  })

  // Initialize performance monitoring on mount
  useEffect(() => {
    initPerformanceMonitoring()
  }, [])

  useEffect(() => {
    if (
      filters.search === null &&
      filters.category === null &&
      filters.min_price === null &&
      filters.max_price === null &&
      filters.sort === 'newest' &&
      filters.page === 1
    ) {
      setFilters(
        {
          search: initialFilters.search,
          category: initialFilters.category,
          min_price: initialFilters.min_price,
          max_price: initialFilters.max_price,
          sort: initialFilters.sort,
          page: initialFilters.page,
        },
        { history: 'replace' },
      )
    }
  }, [])

  const { data, isLoading, isError, error, refetch } = usePublicProducts(
    {
      search: filters.search || undefined,
      category: filters.category || undefined,
      minPrice: filters.min_price || undefined,
      maxPrice: filters.max_price || undefined,
      sort: (filters.sort as 'newest' | 'price_asc' | 'price_desc') || 'newest',
      page: filters.page || 1,
      limit: 24,
    },
    {
      // Use initial data to prevent loading state on mount
      initialData: {
        items: initialProducts,
        pagination: {
          total_count: initialTotalCount,
          max_page: initialTotalPages,
        },
      },
      // Keep previous data during transitions for smoother UX
      keepPreviousData: true,
      // Stale time of 5 minutes
      staleTime: 5 * 60 * 1000,
      // Reduce refetch frequency for better performance
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  )

  const { data: featuredData } = usePublicProducts(
    {
      isFeatured: true,
      limit: 6,
    },
    {
      initialData: {
        items: initialFeaturedProducts,
        pagination: {
          total_count: initialFeaturedProducts.length,
          max_page: 1,
        },
      },
      staleTime: 10 * 60 * 1000, // Featured products change less frequently
    },
  )

  const handleFilterChange = {
    setSearch: useCallback(
      (search: string | null) => setFilters({ search, page: 1 }),
      [setFilters],
    ),
    setCategory: useCallback(
      (category: string | null) => setFilters({ category, page: 1 }),
      [setFilters],
    ),
    setPriceRange: useCallback(
      (min: number | null, max: number | null) =>
        setFilters({ min_price: min, max_price: max, page: 1 }),
      [setFilters],
    ),
    setSort: useCallback(
      (sort: string) => setFilters({ sort, page: 1 }),
      [setFilters],
    ),
    setPage: useCallback(
      (page: number) => {
        setFilters({ page })
        window.scrollTo({ top: 0, behavior: 'smooth' })
      },
      [setFilters],
    ),
    clearFilters: useCallback(
      () =>
        setFilters({
          search: null,
          category: null,
          min_price: null,
          max_price: null,
          sort: 'newest',
          page: 1,
        }),
      [setFilters],
    ),
  }

  const products = data?.items ?? initialProducts
  const totalCount = data?.pagination.total_count ?? initialTotalCount
  const totalPages = data?.pagination.max_page ?? initialTotalPages
  const featuredProducts = featuredData?.items ?? initialFeaturedProducts

  return (
    <MarketplaceContent
      products={products}
      totalCount={totalCount}
      currentPage={filters.page || 1}
      totalPages={totalPages}
      featuredProducts={featuredProducts}
      filters={filters}
      isLoading={isLoading}
      isError={isError}
      error={error}
      onFilterChange={handleFilterChange}
      onRefetch={refetch}
    />
  )
}
