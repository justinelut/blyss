'use client'

import { CategoryNavigation } from '@/components/Category/CategoryNavigation'
import { ProductCard } from '@/components/Products/ProductCard'
import {
  useCategoryBySlug,
  useCategoryProducts,
} from '@/hooks/queries/categories'
import { cn } from '@/utils/cn'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface CategoryPageProps {
  params: { slug: string }
}

export default function CategoryPage({ params }: CategoryPageProps) {
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState(1)
  const limit = 24

  const {
    data: category,
    isLoading: isCategoryLoading,
    isError: isCategoryError,
  } = useCategoryBySlug(params.slug)

  const {
    data: productsData,
    isLoading: isProductsLoading,
    isError: isProductsError,
  } = useCategoryProducts(
    {
      slug: params.slug,
      page: currentPage,
      limit,
    },
    { keepPreviousData: true },
  )

  const isLoading = isCategoryLoading || isProductsLoading
  const isError = isCategoryError || isProductsError

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Category Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            The category you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => router.push('/marketplace')}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    )
  }

  const products = productsData?.items || []
  const totalPages = productsData?.pagination?.max_page || 1
  const totalCount = productsData?.pagination?.total_count || 0

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <CategoryNavigation className="mb-6" />

        {isLoading ? (
          <div className="space-y-2">
            <div className="h-10 w-64 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-6 w-96 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          </div>
        ) : (
          category && (
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {category.name}
              </h1>
              {category.description && (
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  {category.description}
                </p>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-500">
                {totalCount} {totalCount === 1 ? 'product' : 'products'}
              </p>
            </div>
          )
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
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="rounded-full bg-gray-100 p-6 dark:bg-gray-800">
            <svg
              className="h-12 w-12 text-gray-400 dark:text-gray-600"
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
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            No Products Yet
          </h2>
          <p className="max-w-md text-gray-600 dark:text-gray-400">
            There are no products in this category yet. Check back soon or
            explore other categories.
          </p>
          <button
            onClick={() => router.push('/marketplace')}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Browse All Products
          </button>
        </div>
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
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={cn(
                  'flex items-center gap-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                  currentPage === 1
                    ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-600'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:bg-gray-800',
                )}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber: number
                  if (totalPages <= 5) {
                    pageNumber = i + 1
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i
                  } else {
                    pageNumber = currentPage - 2 + i
                  }

                  return (
                    <button
                      key={pageNumber}
                      onClick={() => setCurrentPage(pageNumber)}
                      className={cn(
                        'h-10 w-10 rounded-lg text-sm font-medium transition-colors',
                        currentPage === pageNumber
                          ? 'bg-blue-600 text-white dark:bg-blue-500'
                          : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800',
                      )}
                    >
                      {pageNumber}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className={cn(
                  'flex items-center gap-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                  currentPage === totalPages
                    ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-600'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:bg-gray-800',
                )}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
