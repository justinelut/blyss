'use client'

import { useEffect } from 'react'
import { motion, useReducedMotion, AnimatePresence } from 'motion/react'
import { FiSliders, FiX } from 'react-icons/fi'
import {
  BrowseFilterRail,
  type BrowseFilters,
  type FilterCategory,
} from './BrowseFilterRail'
import { cn } from '@/lib/utils'

interface BrowseMobileFiltersProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: BrowseFilters
  categories: FilterCategory[]
  onChange: (next: Partial<BrowseFilters>) => void
  onClear: () => void
  activeCount: number
}

/**
 * BrowseMobileFiltersTrigger — button shown on mobile that opens the sheet.
 */
export const BrowseMobileFiltersTrigger = ({
  onClick,
  activeCount,
  className,
}: {
  onClick: () => void
  activeCount: number
  className?: string
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-11 items-center gap-2 rounded-md bg-[var(--surface-sunken)] px-4 font-sans text-[14px] text-[var(--text-primary)] transition-colors hover:bg-[var(--surface)]',
        className,
      )}
    >
      <FiSliders size={16} />
      Filters
      {activeCount > 0 && (
        <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 font-sans text-[11px] font-semibold tabular-nums text-[var(--accent-foreground)]">
          {activeCount}
        </span>
      )}
    </button>
  )
}

/**
 * BrowseMobileFilters — full-height bottom sheet for filter controls on
 * mobile/tablet viewports.
 *
 * Per plan §6.2: triggered by the Filters button + chip row. Slides up from
 * bottom of viewport, full-height with header + filter rail + sticky apply
 * button at bottom.
 */
export const BrowseMobileFilters = ({
  open,
  onOpenChange,
  filters,
  categories,
  onChange,
  onClear,
  activeCount,
}: BrowseMobileFiltersProps) => {
  const reduce = useReducedMotion()

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 z-40 bg-[rgba(15,14,12,0.5)] lg:hidden"
            aria-hidden="true"
          />
          {/* Sheet */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            initial={reduce ? false : { y: '100%' }}
            animate={{ y: 0 }}
            exit={reduce ? undefined : { y: '100%' }}
            transition={{
              duration: reduce ? 0 : 0.32,
              ease: [0.32, 0.72, 0, 1],
            }}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88vh] flex-col rounded-t-2xl bg-[var(--background)] lg:hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <h2 className="font-display text-[18px] font-semibold text-[var(--text-primary)]">
                Filters
              </h2>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Close filters"
                className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Filter content (scrollable) */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <BrowseFilterRail
                filters={filters}
                categories={categories}
                onChange={onChange}
                onClear={onClear}
                activeCount={activeCount}
              />
            </div>

            {/* Sticky apply bar */}
            <div className="border-t border-[var(--border)] bg-[var(--surface-elevated)] px-6 py-4">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="inline-flex h-12 w-full items-center justify-center rounded-md bg-[var(--accent)] font-sans text-[15px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
              >
                Show results
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
