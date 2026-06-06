'use client'

/* Hallmark · macrostructure: Catalogue + Discovery hybrid · genre: editorial
 * theme: blyss-design (light cream + burnt orange #C2410C accent)
 * sections:
 *   - Sticky search hero (full-width input, accent focus)
 *   - Empty state    : Trending products grid · Browse by craft · Featured creators
 *   - Result state   : 4-up grid of MarketplaceProductCard · Creators row
 *   - No-hits state  : Productive empty state · Trending products
 * nav: N9 (inherited) · footer: Ft1 (inherited)
 * contrast: pass · slop: pass (gates 1, 2, 7, 8, 36, 51–55, 66, 67)
 *
 * Reference DNA: Etsy + SSENSE — buyers at /search are hunting OR browsing.
 * Empty state behaves like an editor's pick wall (trending + categories +
 * creators), not a blank page. Results state shows visual cards — buyers
 * scan grids faster than typographic lists for shopping intent.
 */

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, useReducedMotion } from 'motion/react'
import Link from 'next/link'
import { FiSearch, FiX, FiArrowRight } from 'react-icons/fi'
import { schemas } from '@/lib/api'
import { Eyebrow, typography } from '@/design'
import { cn } from '@/lib/utils'
import { MarketplaceProductCard } from '@/components/Marketplace/MarketplaceProductCard'
import { MarketplaceCreatorCard } from '@/components/Marketplace/MarketplaceCreatorCard'
import { BrowseByCraft, type CategoryTile } from '@/components/Marketplace/BrowseByCraft'

interface SearchResultsProps {
  query: string
  category?: string
  products: schemas['Product'][]
  totalCount: number
  /** Trending products shown on empty + no-hits states. */
  trendingProducts: schemas['Product'][]
  /** Featured creators shown alongside results + on empty state. */
  featuredCreators: schemas['Organization'][]
  /** Category tiles shown on empty state. */
  categories: CategoryTile[]
}

export const SearchResults = ({
  query,
  products,
  totalCount,
  trendingProducts,
  featuredCreators,
  categories,
}: SearchResultsProps) => {
  const router = useRouter()
  const params = useSearchParams()
  const [input, setInput] = useState(query)
  const reduce = useReducedMotion()
  const ease = [0.32, 0.72, 0, 1] as const

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const next = new URLSearchParams(params)
    if (input.trim()) next.set('q', input.trim())
    else next.delete('q')
    router.push(`/search?${next.toString()}`)
  }

  const hasResults = products.length > 0
  const showEmptyDiscovery = !query
  const showNoHits = !!query && !hasResults
  const showHits = !!query && hasResults

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-10 md:px-16 md:py-16">
      {/* Header */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
      >
        <Eyebrow accent>Search</Eyebrow>
        <h1
          className={cn(
            'mt-4 max-w-[20ch] font-display font-semibold tracking-[-0.02em] leading-[1.05]',
            'text-[clamp(36px,5vw,64px)] text-[var(--text-primary)]',
          )}
        >
          {query ? `Results for “${query}”` : 'Find what you need.'}
        </h1>
      </motion.div>

      {/* Search bar — single editorial line, hairline rule below.
          No card, no rounded box: a search field is a writing surface,
          not a UI widget. Hairline turns burnt orange on focus so the
          buyer knows where the cursor is without a heavy frame. */}
      <motion.form
        onSubmit={submit}
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease, delay: 0.1 }}
        className="mt-8"
      >
        <div className="flex w-full max-w-[720px] items-center gap-3 border-b border-[var(--border)] py-3 transition-colors focus-within:border-[var(--accent)]">
          <FiSearch
            size={18}
            className="shrink-0 text-[var(--text-muted)]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Templates, beats, courses…"
            className="flex-1 bg-transparent font-sans text-[16px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            autoFocus
          />
          {input && (
            <button
              type="button"
              onClick={() => setInput('')}
              aria-label="Clear search"
              className="flex h-7 w-7 items-center justify-center text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            >
              <FiX size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </motion.form>

      {/* RESULT STATE — 4-up product grid + creators row */}
      {showHits && (
        <>
          <p className="mt-2 font-sans text-[14px] text-[var(--text-muted)]">
            {totalCount.toLocaleString()}{' '}
            {totalCount === 1 ? 'result' : 'results'}
          </p>

          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 md:gap-y-12 lg:grid-cols-4">
            {products.map((p) => (
              <MarketplaceProductCard key={p.id} product={p} />
            ))}
          </div>

          {featuredCreators.length > 0 && (
            <section className="mt-20">
              <Eyebrow>Creators worth following</Eyebrow>
              <h2
                className={cn(
                  typography.h3,
                  'mt-3 text-[var(--text-primary)]',
                )}
              >
                Shops you might like.
              </h2>
              <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
                {featuredCreators.slice(0, 4).map((c) => (
                  <MarketplaceCreatorCard
                    key={c.id}
                    creator={c}
                    variant="compact"
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* NO-HITS STATE — productive empty + trending */}
      {showNoHits && (
        <>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.2 }}
            className="mt-2 max-w-[44ch]"
          >
            <h2
              className={cn(typography.h3, 'text-[var(--text-primary)]')}
            >
              Nothing matched “{query}”.
            </h2>
            <p
              className={cn(
                typography.body,
                'mt-4 text-[var(--text-secondary)]',
              )}
            >
              Try different keywords, check spelling, or browse what&apos;s
              trending right now.
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

          {trendingProducts.length > 0 && (
            <section className="mt-20">
              <Eyebrow>You might like</Eyebrow>
              <h2
                className={cn(
                  typography.h3,
                  'mt-3 text-[var(--text-primary)]',
                )}
              >
                Trending now.
              </h2>
              <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 md:gap-y-12 lg:grid-cols-4">
                {trendingProducts.slice(0, 8).map((p) => (
                  <MarketplaceProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* EMPTY (no query) — discovery wall */}
      {showEmptyDiscovery && (
        <>
          {trendingProducts.length > 0 && (
            <section className="mt-12">
              <Eyebrow>Editor&apos;s picks</Eyebrow>
              <h2
                className={cn(
                  typography.h3,
                  'mt-3 text-[var(--text-primary)]',
                )}
              >
                Trending right now.
              </h2>
              <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 md:gap-y-12 lg:grid-cols-4">
                {trendingProducts.slice(0, 8).map((p) => (
                  <MarketplaceProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}

          {categories.length > 0 && (
            <div className="mt-20">
              <BrowseByCraft categories={categories} />
            </div>
          )}

          {featuredCreators.length > 0 && (
            <section className="mt-20">
              <Eyebrow>Creators worth following</Eyebrow>
              <h2
                className={cn(
                  typography.h3,
                  'mt-3 text-[var(--text-primary)]',
                )}
              >
                Independent shops to know.
              </h2>
              <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
                {featuredCreators.slice(0, 4).map((c) => (
                  <MarketplaceCreatorCard
                    key={c.id}
                    creator={c}
                    variant="compact"
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
