'use client'

/* Hallmark · macrostructure: Index First · genre: editorial
 * theme: blyss-design (light cream + burnt orange #C2410C accent)
 * sections: Search header · Search bar · Result count · Vertical typographic
 *           index (hairline rules between rows) · Editorial empty state
 * nav: N9 (inherited) · footer: Ft1 (inherited)
 * contrast: pass · slop: pass (gates 1, 2, 7, 8, 36, 51–55, 66, 67)
 *
 * Reference DNA: Are.na channel page — vertical list of titles, hairline
 * rules between rows, meta right-flushed. Search results are NOT a grid:
 * a search query implies the user is hunting for a specific thing, not
 * browsing — index format gets them to the answer faster.
 */

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, useReducedMotion } from 'motion/react'
import Link from 'next/link'
import { FiSearch, FiX, FiArrowRight } from 'react-icons/fi'
import { schemas } from '@/lib/api'
import { useDisplayCurrency } from '@/components/Marketplace/CurrencyProvider'
import { findPriceForCurrency } from '@/lib/currency/marketplace'
import { Eyebrow, typography, StaggerList, StaggerItem } from '@/design'
import { cn } from '@/lib/utils'

interface SearchResultsProps {
  query: string
  category?: string
  products: schemas['Product'][]
  totalCount: number
}

export const SearchResults = ({ query, products, totalCount }: SearchResultsProps) => {
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

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-12 md:px-16 md:py-20">
      {/* Header + search bar */}
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

      <motion.form
        onSubmit={submit}
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease, delay: 0.1 }}
        className="mt-8 flex w-full max-w-[640px] items-center gap-2 rounded-md bg-[var(--surface-sunken)] px-4 py-3 transition-colors focus-within:bg-[var(--surface)] focus-within:ring-1 focus-within:ring-[var(--border-strong)]"
      >
        <FiSearch size={18} className="shrink-0 text-[var(--text-muted)]" />
        <input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Templates, beats, courses…"
          className="flex-1 bg-transparent font-sans text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
          autoFocus
        />
        {input && (
          <button
            type="button"
            onClick={() => setInput('')}
            aria-label="Clear search"
            className="flex h-7 w-7 items-center justify-center rounded text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]"
          >
            <FiX size={16} />
          </button>
        )}
      </motion.form>

      {/* Results */}
      {query ? (
        <>
          <p className="mt-8 font-sans text-[14px] text-[var(--text-muted)]">
            {totalCount === 0
              ? 'No matches found.'
              : `${totalCount.toLocaleString()} ${totalCount === 1 ? 'result' : 'results'}`}
          </p>

          {products.length > 0 ? (
            <StaggerList className="mt-12 -mx-2 flex flex-col">
              {products.map((p) => (
                <StaggerItem key={p.id}>
                  <SearchResultRow product={p} />
                </StaggerItem>
              ))}
            </StaggerList>
          ) : (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease, delay: 0.2 }}
              className="mt-16 max-w-[44ch]"
            >
              <h2 className={cn(typography.h3, 'text-[var(--text-primary)]')}>
                Nothing matched “{query}”.
              </h2>
              <p className={cn(typography.body, 'mt-4 text-[var(--text-secondary)]')}>
                Try different keywords, check spelling, or browse all
                categories.
              </p>
              <Link
                href="/marketplace"
                className="group mt-8 inline-flex h-11 items-center gap-2 rounded-md bg-[var(--accent)] px-6 font-sans text-[14px] font-medium text-[var(--accent-foreground)] transition-all hover:bg-[var(--accent-hover)] hover:gap-3"
              >
                Browse all
                <FiArrowRight
                  size={15}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </motion.div>
          )}
        </>
      ) : (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease, delay: 0.2 }}
          className="mt-12 max-w-[44ch]"
        >
          <p className={cn(typography.body, 'text-[var(--text-secondary)]')}>
            Search for templates, beats, ebooks, presets, courses, or any of
            our creators.
          </p>
        </motion.div>
      )}
    </div>
  )
}

/**
 * SearchResultRow — a single product as a typographic row in the index.
 * Hairline rule below each row; the parent ul has no gap between rows.
 */
function SearchResultRow({ product }: { product: schemas['Product'] }) {
  const displayCurrency = useDisplayCurrency()
  const prices = (product.prices ?? []) as Array<{
    price_amount?: number
    price_currency?: string
  }>
  const price =
    (findPriceForCurrency(product, displayCurrency) as
      | { price_amount?: number; price_currency?: string }
      | null) ?? prices[0]
  const amount = price?.price_amount ?? 0
  const currency = (price?.price_currency ?? 'usd').toUpperCase()
  const major = amount / 100
  const priceLabel =
    amount === 0
      ? 'Free'
      : currency === 'KES'
        ? `KSh ${major.toLocaleString('en-KE')}`
        : currency === 'USD'
          ? `US$ ${major.toLocaleString('en-US')}`
          : `${currency} ${major.toLocaleString()}`

  const org = (product as unknown as { organization?: { name?: string } })
    .organization

  return (
    <Link
      href={`/product/${product.id}`}
      prefetch
      className="group flex items-baseline justify-between gap-6 border-b border-[var(--border)] py-5 transition-colors hover:bg-[var(--surface-sunken)]"
    >
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-display text-[18px] font-medium leading-[1.3] text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)] md:text-[20px]">
          {product.name}
        </h3>
        {org?.name && (
          <p className="mt-1 truncate font-sans text-[13px] text-[var(--text-muted)]">
            {org.name}
          </p>
        )}
      </div>
      <p className="shrink-0 font-sans text-[15px] font-medium tabular-nums text-[var(--text-primary)] md:text-[16px]">
        {priceLabel}
      </p>
    </Link>
  )
}
