'use client'

import { useMemo } from 'react'
import { Eyebrow, typography } from '@/design'
import { cn } from '@/lib/utils'

export type CreatorCategory =
  | 'all'
  | 'designers'
  | 'writers'
  | 'musicians'
  | 'educators'
  | 'photographers'
  | 'developers'

interface CreatorsHeroProps {
  /** Currently selected creator-category filter */
  active: CreatorCategory
  onChange: (next: CreatorCategory) => void
  /** Optional total creator count for the metadata line */
  total?: number
}

const filters: { id: CreatorCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'designers', label: 'Designers' },
  { id: 'writers', label: 'Writers' },
  { id: 'musicians', label: 'Musicians' },
  { id: 'educators', label: 'Educators' },
  { id: 'photographers', label: 'Photographers' },
  { id: 'developers', label: 'Developers' },
]

/**
 * CreatorsHero — page intro for /creators.
 *
 * Per plan §6.3: eyebrow "MEET THE MAKERS", headline "Kenya's creative class,
 * online.", filter strip below. The strip is horizontally scrollable on
 * mobile with the active pill in --accent fill.
 */
export const CreatorsHero = ({ active, onChange, total }: CreatorsHeroProps) => {
  const totalLabel = useMemo(() => {
    if (total == null) return null
    return `${total.toLocaleString()} ${total === 1 ? 'creator' : 'creators'}`
  }, [total])

  return (
    <header className="border-b border-[var(--border)]">
      <div className="mx-auto max-w-[1280px] px-6 py-12 md:px-16 md:py-20">
        <Eyebrow>Meet the makers</Eyebrow>
        <h1
          className={cn(
            typography.h1,
            'mt-4 max-w-[18ch] text-[var(--text-primary)]',
          )}
        >
          Kenya&rsquo;s creative class, online.
        </h1>

        {/* Filter strip — horizontal scroll on mobile, inline on desktop */}
        <nav
          className="mt-10 -mx-6 overflow-x-auto px-6 md:mx-0 md:px-0"
          aria-label="Filter creators by craft"
        >
          <div className="flex min-w-max items-center gap-2">
            {filters.map((f) => {
              const isActive = active === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onChange(f.id)}
                  aria-pressed={isActive}
                  className={cn(
                    'inline-flex h-10 shrink-0 items-center justify-center rounded-full px-4 font-sans text-[13px] font-medium transition-colors',
                    isActive
                      ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                      : 'bg-[var(--surface-sunken)] text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]',
                  )}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
        </nav>

        {totalLabel && (
          <p className="mt-6 font-sans text-[13px] text-[var(--text-muted)]">
            {totalLabel}
          </p>
        )}
      </div>
    </header>
  )
}
