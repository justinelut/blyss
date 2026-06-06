'use client'

import { useCategories } from '@/hooks/queries/categories'
import { cn } from '@/lib/utils'
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
            className="h-10 w-32 shrink-0 animate-pulse rounded-md bg-[var(--surface-sunken)]"
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
          'flex shrink-0 items-center justify-between rounded-md border px-3 py-2 font-sans text-sm font-medium whitespace-nowrap transition-colors sm:px-4',
          pathname === '/marketplace'
            ? 'border-[var(--text-primary)] bg-[var(--surface-elevated)] text-[var(--text-primary)]'
            : 'border-[var(--border)] bg-transparent text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]',
        )}
      >
        <span>All Products</span>
        {categories && (
          <span className="ml-2 font-sans text-xs tabular-nums text-[var(--text-muted)]">
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
              'flex shrink-0 items-center justify-between rounded-md border px-3 py-2 font-sans text-sm font-medium whitespace-nowrap transition-colors sm:px-4',
              isActive
                ? 'border-[var(--text-primary)] bg-[var(--surface-elevated)] text-[var(--text-primary)]'
                : 'border-[var(--border)] bg-transparent text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]',
            )}
          >
            <span>{category.name}</span>
            <span className="ml-2 font-sans text-xs tabular-nums text-[var(--text-muted)]">
              {category.product_count}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
