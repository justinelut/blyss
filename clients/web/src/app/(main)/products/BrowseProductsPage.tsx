'use client'

import { FilterSidebar } from '@/components/Marketplace/FilterSidebar'
import { ProductGrid } from '@/components/Marketplace/ProductGrid'
import { SearchBar } from '@/components/Marketplace/SearchBar'
import { SkipLink } from '@/components/Shared/SkipLink'
import { ErrorState } from '@/components/Shared/ErrorState'
import {
  useProductCategories,
  usePublicProducts,
} from '@/hooks/queries/products'
import { schemas } from '@/lib/api'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useState } from 'react'

type SortOption = 'newest' | 'price_asc' | 'price_desc'

export const BrowseProductsPage = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 999999])
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [page, setPage] = useState(1)
  const selectedCurrency = 'kes' // TODO: Get from currency store

  // Fetch categories
  const { data: categoriesData } = useProductCategories()
  const categories: schemas['Category'][] =
    categoriesData?.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.id,
      created_at: new Date().toISOString(),
      modified_at: null,
    })) || []

  // Fetch products with filters
  const { data, isLoading, isFetching, error, refetch } = usePublicProducts(
    {
      search: searchQuery || undefined,
      category:
        selectedCategories.length > 0 ? selectedCategories[0] : undefined,
      minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
      maxPrice: priceRange[1] < 999999 ? priceRange[1] : undefined,
      sort: sortBy,
      page,
      limit: 24,
    },
    {
      keepPreviousData: true,
    },
  )

  // Log errors for debugging
  if (error) {
    console.error('Failed to fetch products:', error)
  }

  const products = data?.items || []
  const hasMore = data ? page < data.pagination.max_page : false

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setPage(1)
  }

  const handleCategoryChange = (categories: string[]) => {
    setSelectedCategories(categories)
    setPage(1)
  }

  const handlePriceRangeChange = (range: [number, number]) => {
    setPriceRange(range)
    setPage(1)
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setSelectedCategories([])
    setPriceRange([0, 999999])
    setPage(1)
  }

  const handleSortChange = (value: string) => {
    setSortBy(value as SortOption)
    setPage(1)
  }

  const handleLoadMore = () => {
    if (!isFetching && hasMore) {
      setPage((prev) => prev + 1)
    }
  }

  return (
    <div className="bg-surface dark:bg-on-surface min-h-screen">
      <SkipLink />

      {/* Sticky Header with Search */}
      <header className="shadow-editorial dark:bg-on-surface sticky top-0 z-40 border-b border-gray-200 bg-white dark:border-gray-700">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h1 className="font-epilogue text-on-surface text-2xl font-bold tracking-tight md:text-3xl dark:text-white">
              Browse Products
            </h1>
            <div className="flex flex-1 items-center gap-4 md:max-w-md">
              <SearchBar
                placeholder="Search products..."
                onSearch={handleSearch}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex gap-8">
          {/* Filter Sidebar */}
          <FilterSidebar
            categories={categories}
            selectedCategories={selectedCategories}
            priceRange={priceRange}
            selectedCurrency={selectedCurrency}
            onCategoryChange={handleCategoryChange}
            onPriceRangeChange={handlePriceRangeChange}
            onClearFilters={handleClearFilters}
            className="w-64 shrink-0"
          />

          {/* Products Grid */}
          <section className="flex-1" aria-label="Product results">
            {/* Sort and Results Count */}
            <div className="mb-6 flex items-center justify-between">
              <p className="text-on-surface-variant text-sm dark:text-gray-400" role="status" aria-live="polite">
                {isLoading ? (
                  'Loading...'
                ) : (
                  <>
                    {data?.pagination.total_count || 0} product
                    {data?.pagination.total_count !== 1 ? 's' : ''} found
                  </>
                )}
              </p>

              <div className="flex items-center gap-2">
                <label htmlFor="sort-select" className="text-on-surface-variant text-sm dark:text-gray-400">
                  Sort by:
                </label>
                <Select value={sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger className="w-40" id="sort-select" aria-label="Sort products">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="price_asc">
                      Price: Low to High
                    </SelectItem>
                    <SelectItem value="price_desc">
                      Price: High to Low
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Product Grid */}
            {error ? (
              <ErrorState
                title="Failed to load products"
                message="We couldn't load the products. Please try again."
                onRetry={() => refetch()}
              />
            ) : (
              <ProductGrid
                products={products}
                currency={selectedCurrency}
                columns={{ mobile: 1, tablet: 2, desktop: 3 }}
                loading={isLoading}
                onLoadMore={handleLoadMore}
                hasMore={hasMore}
              />
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
