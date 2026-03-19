'use client'

import { useProductRatingSummary } from '@/hooks/queries/reviews'
import { Star } from 'lucide-react'

interface ProductRatingSummaryProps {
  productId: string
}

export const ProductRatingSummary = ({
  productId,
}: ProductRatingSummaryProps) => {
  const { data: summary, isLoading } = useProductRatingSummary(productId)

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-24 rounded-lg bg-gray-200 dark:bg-gray-800" />
      </div>
    )
  }

  if (!summary || summary.total_reviews === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center sm:p-6 dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No reviews yet. Be the first to review this product!
        </p>
      </div>
    )
  }

  const { average_rating, total_reviews, rating_distribution } = summary

  const getPercentage = (count: number) => {
    if (total_reviews === 0) return 0
    return (count / total_reviews) * 100
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6 dark:border-gray-800 dark:bg-gray-950">
      <h3 className="mb-3 text-base font-semibold sm:mb-4 sm:text-lg">
        Customer Reviews
      </h3>

      <div className="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-start md:gap-8">
        {/* Average Rating */}
        <div className="flex flex-col items-center gap-2 md:min-w-[150px]">
          <div className="text-3xl font-bold sm:text-4xl">
            {average_rating.toFixed(1)}
          </div>
          <div className="flex gap-0.5 sm:gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <Star
                key={value}
                className={`h-4 w-4 sm:h-5 sm:w-5 ${
                  value <= Math.round(average_rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
              />
            ))}
          </div>
          <div className="text-xs text-gray-600 sm:text-sm dark:text-gray-400">
            {total_reviews} {total_reviews === 1 ? 'review' : 'reviews'}
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="flex-1 space-y-1.5 sm:space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count =
              rating_distribution[rating as keyof typeof rating_distribution] ||
              0
            const percentage = getPercentage(count)

            return (
              <div key={rating} className="flex items-center gap-2">
                <div className="flex w-10 items-center gap-1 text-xs sm:w-12 sm:text-sm">
                  <span>{rating}</span>
                  <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400 sm:h-3 sm:w-3" />
                </div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                  <div
                    className="h-full bg-yellow-400 transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="w-8 text-right text-xs text-gray-600 sm:w-12 sm:text-sm dark:text-gray-400">
                  {count}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
