'use client'

import { FiSearch, FiX } from 'react-icons/fi'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface BrowseSearchBarProps {
  value: string
  onChange: (value: string) => void
  /** Debounce delay (ms). Defaults to 350ms. */
  debounceMs?: number
  className?: string
}

/**
 * BrowseSearchBar — sticky search input at top of right column.
 *
 * Per plan §6.2: autocomplete dropdown comes in v1.1; v1 just runs the
 * provided onChange after a debounce so URL state + grid refetch happen.
 *
 * Visual: --surface-sunken bg, no border default, focus underline accent.
 */
export const BrowseSearchBar = ({
  value,
  onChange,
  debounceMs = 350,
  className,
}: BrowseSearchBarProps) => {
  const [local, setLocal] = useState(value)

  // Sync from outside (e.g. when user clears via chip row)
  useEffect(() => setLocal(value), [value])

  // Debounced push of local → onChange
  useEffect(() => {
    if (local === value) return
    const t = setTimeout(() => onChange(local), debounceMs)
    return () => clearTimeout(t)
  }, [local, value, onChange, debounceMs])

  return (
    <div className={cn('relative w-full', className)}>
      <FiSearch
        size={18}
        aria-hidden="true"
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
      />
      <input
        type="search"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder="Search the marketplace…"
        aria-label="Search products"
        className={cn(
          'h-12 w-full rounded-md bg-[var(--surface-sunken)] px-12 font-sans text-[15px] text-[var(--text-primary)]',
          'placeholder:text-[var(--text-muted)]',
          'focus:outline-none focus:ring-0',
          'border-0 border-b-2 border-transparent transition-colors',
          'focus:border-[var(--accent)]',
        )}
      />
      {local && (
        <button
          type="button"
          onClick={() => setLocal('')}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
        >
          <FiX size={16} />
        </button>
      )}
    </div>
  )
}
