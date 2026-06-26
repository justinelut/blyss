'use client'

/* Hallmark · macrostructure: Catalogue (category page) · genre: editorial
 * theme: blyss-design (light cream + burnt orange #C2410C accent)
 * sections: CategoryNavigation strip · Page head · Product grid (2-col
 *           mobile, 4-col desktop) · Typographic pagination
 * nav: N9 (inherited) · footer: Ft1 (inherited)
 * contrast: pass · slop: pass (gates 1, 2, 7, 8, 36, 51–55, 67)
 *
 * Replaces a Polar-era page that used gray + blue palette and a separate
 * ProductCard. Now uses MarketplaceProductCard so ratings, currency-aware
 * pricing, and palette discipline match the rest of the marketplace.
 */

import { CategoryNavigation } from '@/components/Category/CategoryNavigation'
import { MarketplaceProductCard } from '@/components/Marketplace/MarketplaceProductCard'
import {
  useCategoryBySlug,
  useCategoryProducts,
} from '@/hooks/queries/categories'
import { cn } from '@/lib/utils'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { useRouter } from 'next/navigation'
import { use, useState } from 'react'
import { schemas } from '@/lib/api'

interface CategoryPageProps {
  // Next.js 15 made params a Promise. Synchronously reading params.slug
  // (the previous code path) returned undefined under Next.js 15, which
  // disabled the products query (enabled: !!parameters.slug) and the
  // page rendered "Nothing here yet" forever — even though the API
  // returned data. React.use() unwraps the promise inside the client
  // component without making the component itself async.
  params: Promise<{ slug: string }>
}

export function CategoryPageClient({ params }: CategoryPageProps) {
  const { slug } = use(params)
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState(1)
  const limit = 24

  const {
    data: category,
    isLoading: isCategoryLoading,
    isError: isCategoryError,
  } = useCategoryBySlug(slug)

  const {
    data: productsData,
    isLoading: isProductsLoading,
    isError: isProductsError,
  } = useCategoryProducts(
    {
      slug,
      page: currentPage,
      limit,
    },
    { keepPreviousData: true },
  )

  const isLoading = isCategoryLoading || isProductsLoading
  const isError = isCategoryError || isProductsError

  if (isError) {
    return (
      <div className="mx-auto max-w-[1280px] px-6 py-16 md:px-16 md:py-24">
        <div className="flex flex-col items-start gap-4">
          <h1 className="font-display text-[clamp(28px,4vw,44px)] font-semibold leading-[1.05] text-[var(--text-primary)]">
            Category not found.
          </h1>
          <p className="max-w-[44ch] font-sans text-[15px] leading-[1.55] text-[var(--text-secondary)]">
            The category you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => router.push('/marketplace')}
            className="mt-4 inline-flex h-11 items-center justify-center rounded-md bg-[var(--accent)] px-6 font-sans text-sm font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    )
  }

  const products = (productsData?.items || []) as schemas['Product'][]
  const totalPages = productsData?.pagination?.max_page || 1
  const totalCount = productsData?.pagination?.total_count || 0

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-10 md:px-16 md:py-12">
      <div className="mb-8">
        <CategoryNavigation className="mb-6" />

        {isLoading ? (
          <div className="space-y-2">
            <div className="h-10 w-64 animate-pulse rounded-md bg-[var(--surface-sunken)]" />
            <div className="h-6 w-96 animate-pulse rounded-md bg-[var(--surface-sunken)]" />
          </div>
        ) : (
          category && (
            <div className="flex flex-col gap-2">
              <h1 className="font-display text-[clamp(28px,4vw,44px)] font-semibold tracking-[-0.02em] leading-[1.05] text-[var(--text-primary)]">
                {category.name}
              </h1>
              {category.description && (
                <p className="max-w-[60ch] font-sans text-[16px] leading-[1.5] text-[var(--text-secondary)]">
                  {category.description}
                </p>
              )}
              <p className="font-sans text-[13px] tabular-nums text-[var(--text-muted)]">
                {totalCount} {totalCount === 1 ? 'product' : 'products'}
              </p>
            </div>
          )
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-3 xl:grid-cols-4 lg:gap-y-12">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <div className="aspect-[4/5] w-full animate-pulse rounded-md bg-[var(--surface-sunken)]" />
              <div className="flex flex-col gap-2">
                <div className="h-5 w-3/4 animate-pulse rounded bg-[var(--surface-sunken)]" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-[var(--surface-sunken)]" />
                <div className="h-5 w-1/3 animate-pulse rounded bg-[var(--surface-sunken)]" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-start gap-4 py-16">
          <h2 className="font-display text-[24px] font-semibold leading-[1.2] text-[var(--text-primary)]">
            Nothing here yet.
          </h2>
          <p className="max-w-[44ch] font-sans text-[15px] leading-[1.55] text-[var(--text-secondary)]">
            There are no products in this category yet. Check back soon or
            explore other categories.
          </p>
          <button
            onClick={() => router.push('/marketplace')}
            className="mt-2 inline-flex h-11 items-center justify-center rounded-md bg-[var(--accent)] px-6 font-sans text-sm font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            Browse all products
          </button>
        </div>
      ) : (
        <>
          {/* 2-col on mobile (per buyer-conversion brief), 3-col tablet,
              4-col desktop. Tighter gap on phone so two cards fit at 320px. */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-3 xl:grid-cols-4 lg:gap-y-12">
            {products.map((product) => (
              <MarketplaceProductCard key={product.id} product={product} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border)] pt-6">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={cn(
                  'flex items-center gap-1 rounded-md border px-4 py-2 font-sans text-sm font-medium transition-colors',
                  currentPage === 1
                    ? 'cursor-not-allowed border-[var(--border)] bg-transparent text-[var(--text-muted)]'
                    : 'border-[var(--border-strong)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--surface-sunken)]',
                )}
              >
                <FiChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) =>
                    p === 1 ||
                    p === totalPages ||
                    Math.abs(p - currentPage) <= 1,
                  )
                  .map((pageNumber, i, arr) => {
                    const showEllipsis =
                      i > 0 && pageNumber - arr[i - 1] > 1
                    return (
                      <div key={pageNumber} className="flex items-center">
                        {showEllipsis && (
                          <span className="px-2 font-sans text-sm tabular-nums text-[var(--text-muted)]">
                            …
                          </span>
                        )}
                        <button
                          onClick={() => setCurrentPage(pageNumber)}
                          className={cn(
                            'h-10 w-10 rounded-md font-sans text-sm font-medium tabular-nums transition-colors',
                            currentPage === pageNumber
                              ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                              : 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]',
                          )}
                        >
                          {pageNumber}
                        </button>
                      </div>
                    )
                  })}
              </div>

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className={cn(
                  'flex items-center gap-1 rounded-md border px-4 py-2 font-sans text-sm font-medium transition-colors',
                  currentPage === totalPages
                    ? 'cursor-not-allowed border-[var(--border)] bg-transparent text-[var(--text-muted)]'
                    : 'border-[var(--border-strong)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--surface-sunken)]',
                )}
              >
                Next
                <FiChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
