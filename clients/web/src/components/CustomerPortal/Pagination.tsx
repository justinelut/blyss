'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export const Pagination = ({
  page,
  totalPages,
  onPageChange,
}: PaginationProps) => (
  <div className="flex items-center gap-2">
    <span className="dark:text-polar-500 text-xs text-[var(--text-muted)]">
      Page {page} of {totalPages}
    </span>
    <div className="flex items-center">
      <button
        type="button"
        className="dark:border-polar-700 dark:text-polar-500 dark:hover:bg-polar-800 cursor-pointer rounded-l-md border border-[var(--border)] p-1 text-[var(--text-muted)] hover:bg-[var(--surface)] disabled:cursor-default disabled:opacity-50"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="h-3 w-3" />
      </button>
      <button
        type="button"
        className="dark:border-polar-700 dark:hover:bg-polar-800 -ml-px cursor-pointer rounded-r-md border border-[var(--border)] p-1 text-[var(--text-primary)] hover:bg-[var(--surface)] disabled:cursor-default disabled:opacity-50 dark:text-white"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  </div>
)
