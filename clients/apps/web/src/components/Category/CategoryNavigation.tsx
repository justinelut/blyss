'use client'

import { useCategories } from '@/hooks/queries/categories'
import { cn } from '@/utils/cn'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface CategoryNavigationProps {
  className?: string
  variant?: 'horizontal' | 'vertical'
}

export function CategoryNavigation({
  className,
  variant = 'horizontal',
}: CategoryNavigationProps) {
  const { data: categories, isLoading } = useCategories()
  const pathname = usePathname()

  if (isLoading) {
    return (
      <nav
        className={cn(
          'flex gap-2',
          variant === 'vertical'
            ? 'flex-col'
            : 'scrollbar-thin flex-row overflow-x-auto pb-2',
          className,
        )}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-10 w-32 shrink-0 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800"
          />
        ))}
      </nav>
    )
  }

  if (!categories || categories.length === 0) {
    return null
  }

  const sortedCategories = [...categories].sort(
    (a, b) => a.display_order - b.display_order,
  )

  return (
    <nav
      className={cn(
        'flex gap-2',
        variant === 'vertical'
          ? 'flex-col'
          : 'scrollbar-thin flex-row overflow-x-auto pb-2 md:flex-wrap',
        className,
      )}
      aria-label="Product categories"
    >
      <Link
        href="/marketplace"
        className={cn(
          'flex shrink-0 items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors sm:px-4',
          pathname === '/marketplace'
            ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950 dark:text-blue-300'
            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:bg-gray-800',
        )}
      >
        <span>All Products</span>
        {categories && (
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
            {categories.reduce((sum, cat) => sum + cat.product_count, 0)}
          </span>
        )}
      </Link>

      {sortedCategories.map((category) => {
        const isActive = pathname === `/category/${category.slug}`

        return (
          <Link
            key={category.id}
            href={`/category/${category.slug}`}
            className={cn(
              'flex shrink-0 items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors sm:px-4',
              isActive
                ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950 dark:text-blue-300'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:bg-gray-800',
            )}
          >
            <span>{category.name}</span>
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
              {category.product_count}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
