'use client'

import { ProductCard } from '@/components/Products/ProductCard'
import { useProductCategories } from '@/hooks/queries/products'
import { schemas } from '@polar-sh/client'
import { PriceRangeFilter } from '@polar-sh/ui/components/molecules/PriceRangeFilter'
import { useRouter } from 'next/navigation'
import { CategoryFilter } from './components/CategoryFilter'
import { EmptyState } from './components/EmptyState'
import { HeroSection } from './components/HeroSection'
import { PaginationControls } from './components/PaginationControls'
import { SearchInput } from './components/SearchInput'
import { SortSelect } from './components/SortSelect'

interface MarketplaceContentProps {
  products: schemas['Product'][]
  totalCount: number
  currentPage: number
  totalPages: number
  featuredProducts: schemas['Product'][]
  filters: {
    search: string | null
    category: string | null
    min_price: number | null
    max_price: number | null
    sort: string | null
    page: number | null
  }
  isLoading: boolean
  isError: boolean
  error: Error | null
  onFilterChange: {
    setSearch: (search: string | null) => void
    setCategory: (category: string | null) => void
    setPriceRange: (min: number | null, max: number | null) => void
    setSort: (sort: string) => void
    setPage: (page: number) => void
    clearFilters: () => void
  }
  onRefetch: () => void
}

export function MarketplaceContent({
  products,
  totalCount,
  currentPage,
  totalPages,
  featuredProducts,
  filters,
  isLoading,
  isError,
  error,
  onFilterChange,
  onRefetch,
}: MarketplaceContentProps) {
  const router = useRouter()
  const { data: categories } = useProductCategories()

  const hasActiveFilters =
    filters.search || filters.category || filters.min_price || filters.max_price

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState
          title="Failed to load products"
          description="We couldn't load the products. Please try again."
          actionLabel="Retry"
          onAction={onRefetch}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <HeroSection />

      {featuredProducts.length > 0 && (
        <section className="container mx-auto px-4">
          <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
            Featured Products
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredProducts.slice(0, 6).map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                organization={product.organization}
                currency="KES"
              />
            ))}
          </div>
        </section>
      )}

      <section className="container mx-auto px-4">
        <div className="mb-6 flex flex-col gap-4">
          <SearchInput
            value={filters.search || ''}
            onChange={onFilterChange.setSearch}
          />

          <div className="flex flex-wrap gap-4">
            <CategoryFilter
              categories={categories || []}
              selectedCategory={filters.category}
              onChange={onFilterChange.setCategory}
            />

            <PriceRangeFilter
              minPrice={filters.min_price}
              maxPrice={filters.max_price}
              onMinPriceChange={(value) =>
                onFilterChange.setPriceRange(value, filters.max_price)
              }
              onMaxPriceChange={(value) =>
                onFilterChange.setPriceRange(filters.min_price, value)
              }
            />

            <SortSelect
              value={
                (filters.sort as 'newest' | 'price_asc' | 'price_desc') ||
                'newest'
              }
              onChange={onFilterChange.setSort}
            />
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isLoading ? 'Loading...' : `${totalCount} products found`}
          </p>
          {hasActiveFilters && (
            <button
              onClick={onFilterChange.clearFilters}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Clear all filters
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800"
              >
                <div className="aspect-square w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
                <div className="flex flex-1 flex-col gap-2">
                  <div className="h-6 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                  <div className="h-6 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                </div>
                <div className="h-10 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          hasActiveFilters ? (
            <EmptyState
              title="No products found"
              description="Try adjusting your filters to see more results."
              actionLabel="Clear Filters"
              onAction={onFilterChange.clearFilters}
            />
          ) : (
            <EmptyState
              title="Marketplace coming soon"
              description="We're populating the marketplace with amazing products from creators."
              actionLabel="Become a Creator"
              onAction={() => router.push('/signup?type=creator')}
            />
          )
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  organization={product.organization}
                  currency="KES"
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-8">
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={onFilterChange.setPage}
                />
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
