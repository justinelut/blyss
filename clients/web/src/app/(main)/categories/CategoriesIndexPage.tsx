'use client'

/* Hallmark · macrostructure: Index First · genre: editorial
 * theme: blyss-design (light cream + burnt orange #C2410C accent)
 * sections: Editorial header · Numbered category index · empty state
 * nav: N9 (inherited) · footer: Ft1 (inherited)
 * contrast: pass · slop: pass (gates 1, 2, 7, 8, 36, 51-55, 67)
 *
 * Reference DNA: Are.na channel browse + SSENSE editorial index. The
 * categories page is a typographic INDEX, not a card grid — buyers
 * don't browse categories visually, they scan a list to find their
 * lane. Numbers + hairline rules between rows + accent-on-hover
 * cadence; product count right-flushed in tabular numerals.
 *
 * Reasoning: BrowseByCraft on the home page already does the
 * card-grid version. /categories is the dedicated long-form index —
 * different macrostructure on purpose so creators bookmarking it
 * have a real index page rather than a duplicate of the home strip.
 */

import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { FiArrowRight } from 'react-icons/fi'
import { Eyebrow, typography } from '@/design'
import { cn } from '@/lib/utils'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  product_count: number
}

interface Props {
  categories: Category[]
}

export const CategoriesIndexPage: React.FC<Props> = ({ categories }) => {
  const reduce = useReducedMotion()
  const ease = [0.32, 0.72, 0, 1] as const

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-12 md:px-16 md:py-20">
      {/* Editorial header */}
      <motion.header
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
      >
        <Eyebrow accent>Browse</Eyebrow>
        <h1
          className={cn(
            typography.h1,
            'mt-4 max-w-[20ch] text-[clamp(40px,5.5vw,68px)] text-[var(--text-primary)]',
          )}
        >
          Every category on Blyss.
        </h1>
        <p className="mt-6 max-w-[58ch] font-sans text-[18px] leading-[1.55] text-[var(--text-secondary)]">
          Pick a lane. Each one is a feed of independent creators selling
          templates, beats, courses, presets, photography &mdash; whatever
          the craft, you&rsquo;ll find someone making it well.
        </p>
      </motion.header>

      {/* Empty state — when ops haven't seeded categories yet. Real
          behaviour during normal operation; keep editorial, not apologetic. */}
      {categories.length === 0 ? (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease, delay: 0.15 }}
          className="mt-16 max-w-[58ch] border-t border-[var(--border)] pt-10"
        >
          <h2 className={cn(typography.h3, 'text-[var(--text-primary)]')}>
            Categories coming soon.
          </h2>
          <p
            className={cn(
              typography.body,
              'mt-4 text-[var(--text-secondary)]',
            )}
          >
            We&rsquo;re seeding the first batch of categories with our
            launch creators. Browse the marketplace directly while we get
            them ready.
          </p>
          <Link
            href="/marketplace"
            className="group mt-8 inline-flex h-11 items-center gap-2 rounded-md bg-[var(--accent)] px-6 font-sans text-[14px] font-medium text-[var(--accent-foreground)] transition-all hover:bg-[var(--accent-hover)] hover:gap-3"
          >
            Browse all
            <FiArrowRight
              size={15}
              aria-hidden="true"
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </motion.div>
      ) : (
        <ul
          className="mt-16 border-t border-[var(--border)]"
          aria-label="Categories"
        >
          {categories.map((category, i) => (
            <motion.li
              key={category.id}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                ease,
                delay: 0.18 + i * 0.04,
              }}
            >
              <Link
                href={`/marketplace?category=${category.slug}`}
                className="group flex items-baseline gap-6 border-b border-[var(--border)] py-7 transition-colors hover:bg-[var(--surface-sunken)] md:gap-10"
              >
                <span
                  className={cn(
                    'shrink-0 font-display text-[28px] font-medium leading-none tracking-[-0.02em] [font-variant-numeric:tabular-nums] md:text-[32px]',
                    'text-[var(--border-strong)] transition-colors group-hover:text-[var(--accent)]',
                  )}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1 pt-1">
                  <h2 className="font-display text-[24px] font-semibold tracking-[-0.02em] leading-[1.15] text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)] md:text-[28px]">
                    {category.name}
                  </h2>
                  {category.description && (
                    <p className="mt-2 max-w-[58ch] font-sans text-[14px] leading-[1.55] text-[var(--text-secondary)]">
                      {category.description}
                    </p>
                  )}
                </div>
                <div className="shrink-0 self-baseline pt-2 text-right">
                  <p className="font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)] tabular-nums">
                    {category.product_count}{' '}
                    {category.product_count === 1 ? 'item' : 'items'}
                  </p>
                </div>
                <FiArrowRight
                  size={18}
                  aria-hidden="true"
                  className="hidden shrink-0 self-baseline pt-1 text-[var(--text-muted)] transition-all group-hover:text-[var(--accent)] group-hover:translate-x-1 md:block"
                />
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  )
}
