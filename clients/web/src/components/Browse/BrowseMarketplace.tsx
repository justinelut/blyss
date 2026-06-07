'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { schemas } from '@/lib/api'
import { Header } from '../Layout/Header'
import { FilterSidebar } from './FilterSidebar'
import { ProductGrid } from './ProductGrid'
import { Pagination } from './Pagination'
import Footer from '../Organization/Footer'
import { api } from '@/utils/client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/Select'

interface Category {
  id: string
  name: string
  slug: string
  product_count: number
}

interface BrowseMarketplaceProps {
  initialProducts: schemas['Product'][]
  initialSearch?: string
  initialCategory?: string
}

export function BrowseMarketplace({
  initialProducts,
  initialSearch = '',
  initialCategory,
}: BrowseMarketplaceProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<schemas['Product'][]>(initialProducts)
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState(initialSearch)
  const [filters, setFilters] = useState({
    categories: initialCategory ? [initialCategory] : [],
    priceMin: 0,
    priceMax: 5000,
    formats: [] as string[],
    model: 'one-time',
  })
  const [sortBy, setSortBy] = useState('relevance')
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [totalCount, setTotalCount] = useState(initialProducts.length)
  const isInitialMount = useRef(true)

  const itemsPerPage = 12

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.GET('/v1/categories', {}) as any
        if (response.data) {
          setCategories(response.data.items || [])
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error)
      }
    }

    fetchCategories()
  }, [])

  // Update URL when search changes (debounced via Header component)
  useEffect(() => {
    // Skip URL update on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    const params = new URLSearchParams()
    if (search) {
      params.set('search', search)
    }
    
    const newUrl = params.toString() ? `/search?${params.toString()}` : '/search'
    router.replace(newUrl, { scroll: false })
  }, [search, router])

  // Fetch products from API when filters change
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true)
      try {
        const response = await api.GET('/v1/products', {
          params: {
            query: {
              q: search || undefined,
              limit: itemsPerPage,
              page: currentPage,
              is_archived: false,
            },
          },
        }) as any

        if (response.data) {
          setProducts(response.data.items || [])
          setTotalCount(response.data.pagination?.total_count || 0)
        }
      } catch (error) {
        console.error('Failed to fetch products:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [search, filters, sortBy, currentPage])

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  return (
    <div className="min-h-screen bg-background">
      <Header search={search} onSearchChange={setSearch} />

      <main className="pt-28 pb-20 px-8 max-w-screen-2xl mx-auto flex flex-col md:flex-row gap-12">
        <FilterSidebar
          filters={filters}
          onFiltersChange={setFilters}
          categories={categories}
        />

        <section className="flex-1">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
            <div>
              <h2 className="text-3xl font-black font-headline tracking-tight text-on-surface">
                Curated Results
              </h2>
              <p className="text-on-surface-variant text-sm font-label mt-1">
                Showing {totalCount} digital creations
              </p>
            </div>
            <div className="flex items-center gap-4">
              <label className="text-xs font-label uppercase tracking-widest text-on-surface-variant">
                Sort By
              </label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger
                  className="bg-surface-container-low border-none rounded-lg text-sm px-4 h-9 focus:ring-2 focus:ring-secondary"
                  aria-label="Sort by"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="newest">Newest Arrivals</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="rating">Top Rated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-40">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : products.length > 0 ? (
            <>
              <ProductGrid products={products} />
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-40 text-center max-w-sm mx-auto">
              <div className="w-24 h-24 bg-surface-container-high rounded-full flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-outline text-4xl">
                  search_off
                </span>
              </div>
              <h3 className="text-2xl font-bold font-headline text-on-surface">
                No assets found
              </h3>
              <p className="text-on-surface-variant mt-3 leading-relaxed">
                We couldn't find anything matching your search. Try adjusting your
                filters or browsing our trending categories.
              </p>
              <button
                onClick={() => {
                  setFilters({
                    categories: [],
                    priceMin: 0,
                    priceMax: 5000,
                    formats: [],
                    model: 'one-time',
                  })
                  setSearch('')
                  setCurrentPage(1)
                }}
                className="mt-8 bg-primary text-on-primary px-8 py-3 rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-primary-container transition-colors shadow-lg shadow-primary/20"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  )
}
