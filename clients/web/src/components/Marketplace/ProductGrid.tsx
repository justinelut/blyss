'use client'

import { schemas } from '@/lib/api'
import Button from '@/components/atoms/Button'
import { useEffect, useRef, useState } from 'react'
import { ProductCard } from './ProductCard'

interface ProductGridProps {
  products: schemas['Product'][]
  currency: string
  columns?: { mobile: number; tablet: number; desktop: number }
  loading?: boolean
  emptyState?: React.ReactNode
  onLoadMore?: () => void
  hasMore?: boolean
}

const ProductSkeleton = () => (
  <div className="flex animate-pulse flex-col gap-3 rounded-lg bg-white p-4 dark:bg-[#1b1c1b]">
    <div
      className="w-full rounded-md bg-gray-200 dark:bg-gray-700"
      style={{ aspectRatio: '4/5' }}
    />
    <div className="space-y-2">
      <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-5 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
    </div>
    <div className="h-10 w-full rounded bg-gray-200 dark:bg-gray-700" />
  </div>
)

export const ProductGrid = ({
  products,
  currency,
  columns = { mobile: 1, tablet: 2, desktop: 4 },
  loading = false,
  emptyState,
  onLoadMore,
  hasMore = false,
}: ProductGridProps) => {
  const [visibleProducts, setVisibleProducts] = useState<Set<string>>(new Set())
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Lazy loading with intersection observer
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const productId = entry.target.getAttribute('data-product-id')
            if (productId) {
              setVisibleProducts((prev) => new Set([...prev, productId]))
            }
          }
        })
      },
      {
        rootMargin: '50px',
      },
    )

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  // Load more observer
  useEffect(() => {
    const loadMoreObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && onLoadMore && !loading) {
          onLoadMore()
        }
      },
      {
        rootMargin: '100px',
      },
    )

    if (loadMoreRef.current) {
      loadMoreObserver.observe(loadMoreRef.current)
    }

    return () => {
      loadMoreObserver.disconnect()
    }
  }, [hasMore, onLoadMore, loading])

  const gridClasses = `grid gap-6 grid-cols-${columns.mobile} md:grid-cols-${columns.tablet} lg:grid-cols-${columns.desktop}`

  if (loading && products.length === 0) {
    return (
      <div className={gridClasses}>
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (!loading && products.length === 0) {
    return (
      emptyState || (
        <section
          className="flex flex-col items-center justify-center py-16"
          role="status"
          aria-label="No products found"
        >
          <div
            className="mb-4 rounded-full bg-[#f6f3f1] p-6 dark:bg-[#2a2b2a]"
            aria-hidden="true"
          >
            <svg
              className="h-12 w-12 text-[#594139] dark:text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
          </div>
          <h3 className="font-epilogue mb-2 text-xl font-semibold tracking-tight text-[#1b1c1b] dark:text-white">
            No products found
          </h3>
          <p className="mb-6 text-sm text-[#594139] dark:text-gray-400">
            Try adjusting your filters or search query
          </p>
          <Button variant="outline" aria-label="Browse all products">
            Browse All Products
          </Button>
        </section>
      )
    )
  }

  return (
    <>
      <div className={gridClasses} role="list" aria-label="Product grid">
        {products.map((product) => {
          const organization = product.organization as schemas['Organization']
          return (
            <div
              key={product.id}
              data-product-id={product.id}
              role="listitem"
              ref={(el) => {
                if (el && observerRef.current) {
                  observerRef.current.observe(el)
                }
              }}
            >
              {visibleProducts.has(product.id) ||
              products.indexOf(product) < 8 ? (
                <ProductCard
                  product={product}
                  organization={organization}
                  currency={currency}
                />
              ) : (
                <ProductSkeleton />
              )}
            </div>
          )
        })}
      </div>

      {/* Load More Trigger */}
      {hasMore && (
        <div
          ref={loadMoreRef}
          className="mt-8 flex justify-center"
          role="status"
          aria-live="polite"
        >
          {loading && (
            <div className="flex items-center gap-2 text-sm text-[#594139] dark:text-gray-400">
              <div
                className="h-4 w-4 animate-spin rounded-full border-2 border-[#a73400] border-t-transparent"
                aria-hidden="true"
              />
              <span>Loading more products...</span>
            </div>
          )}
        </div>
      )}
    </>
  )
}
