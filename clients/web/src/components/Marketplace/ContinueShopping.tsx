'use client'

/* ContinueShopping — "pick up where you left off" surface for the
 * marketplace homepage.
 *
 * Two sources, in priority order:
 *   1. Live cart (useCart) when the visitor is signed in and has items
 *      pending. This is the highest-intent "continue checkout" prompt.
 *   2. Recently viewed products from localStorage (blyss_recently_viewed,
 *      populated by ProductDetail/RecentlyViewed::recordProductView on
 *      every PDP visit). Up to 6 items.
 *
 * Hidden entirely when both sources are empty so the homepage doesn't
 * show a stub on a brand-new visitor's first session. Mounts above
 * FeaturedSubscriptions so it sits high in the page when relevant.
 *
 * Anti-slop:
 *   - No emoji icons, no waving-hand "Welcome back" framing.
 *   - Editorial header (Eyebrow + h2) matching the rest of the page.
 *   - Horizontal scroll on mobile (snap-x), responsive grid on desktop.
 *   - Card uses the same MarketplaceProductCard as the marketplace grid
 *     so visitors see consistent typography + ratings + currency.
 */

import { Eyebrow, SectionDivider, typography } from '@/design'
import { useAuth } from '@/hooks'
import { useCart } from '@/hooks/queries/cart'
import { useDisplayCurrency } from '@/components/Marketplace/CurrencyProvider'
import { schemas } from '@/lib/api'
import { cn } from '@/lib/utils'
import Link from './LocaleLink'
import { useEffect, useState } from 'react'
import { FiArrowRight } from 'react-icons/fi'

const STORAGE_KEY = 'blyss_recently_viewed'

interface RecentlyViewedRow {
  id: string
  name: string
  imageUrl?: string
  price?: number
  currency?: string
  organizationName?: string
}

const readRecent = (): RecentlyViewedRow[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.slice(0, 6) as RecentlyViewedRow[]
  } catch {
    return []
  }
}

const fmtMinor = (
  amount: number | undefined,
  currency: string | undefined,
): string => {
  if (typeof amount !== 'number') return ''
  const major = amount / 100
  const cur = (currency ?? 'KES').toUpperCase()
  if (cur === 'KES') return `KSh ${major.toLocaleString('en-KE')}`
  if (cur === 'USD')
    return `US$ ${major.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`
  return `${cur} ${major.toLocaleString()}`
}

export const ContinueShopping = () => {
  const { authenticated } = useAuth()
  const { data: cart } = useCart(authenticated)
  const cartItemCount =
    (cart as unknown as { items?: unknown[] } | undefined)?.items?.length ?? 0
  const cartHasItems = cartItemCount > 0

  // Visitor's display currency (from /{country}/ URL or cookie or
  // cf-ipcountry — see proxy.ts). Recently-viewed entries store the
  // price in the currency the visitor saw at PDP time. If the visitor
  // has since switched country, those stale prices would mislead. We
  // honor the snapshot ONLY when its currency matches today's display
  // currency; otherwise we hide the price line and let the click-through
  // re-fetch fresh pricing from the PDP.
  const visitorCurrency = useDisplayCurrency().toUpperCase()

  const [recent, setRecent] = useState<RecentlyViewedRow[]>([])
  useEffect(() => {
    setRecent(readRecent())
  }, [])

  // Hide entirely when there's nothing to resume.
  if (!cartHasItems && recent.length === 0) return null

  return (
    <SectionDivider tone="default" density="md">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Eyebrow>Pick up where you left off</Eyebrow>
          <h2 className={cn(typography.h2, 'mt-3 text-[var(--text-primary)]')}>
            {cartHasItems ? 'Your cart is waiting' : 'Recently viewed'}
          </h2>
        </div>
      </div>

      {/* Cart resume row — first because it's higher intent. */}
      {cartHasItems && (
        <Link
          href="/cart"
          className={cn(
            'group mb-8 flex items-center justify-between gap-3 rounded-md border px-5 py-4 transition-colors',
            'border-[var(--border-strong)] bg-[var(--surface-elevated)]',
            'hover:bg-[var(--surface-sunken)]',
          )}
        >
          <div className="flex flex-col">
            <span className="font-sans text-[14px] font-medium text-[var(--text-primary)]">
              You have {cartItemCount}{' '}
              {cartItemCount === 1 ? 'item' : 'items'} in your cart
            </span>
            <span className="font-sans text-[13px] text-[var(--text-muted)]">
              Resume checkout to finish.
            </span>
          </div>
          <FiArrowRight
            aria-hidden="true"
            size={16}
            className="shrink-0 text-[var(--text-secondary)] transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      )}

      {/* Recently-viewed strip. Horizontal snap-scroll on mobile,
          responsive grid on desktop. */}
      {recent.length > 0 && (
        <div
          className={cn(
            'flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2',
            'scrollbar-thin md:grid md:grid-cols-3 md:gap-x-6 md:gap-y-12 md:overflow-visible md:pb-0 lg:grid-cols-6',
          )}
          aria-label="Recently viewed products"
        >
          {recent.map((p) => (
            <Link
              key={p.id}
              href={`/product/${p.id}`}
              prefetch
              className="group block w-[160px] shrink-0 snap-start md:w-auto md:shrink"
            >
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-md bg-[var(--surface-sunken)]">
                {p.imageUrl ? (
                  // Plain <img> here is intentional — the homepage already
                  // ships next/image elsewhere; keeping this lightweight
                  // (no priority hints, no blur placeholder) since the
                  // strip lives below the fold for most visitors.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.04]"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-end p-4">
                    <span className="font-display text-[36px] font-light text-[var(--text-muted)]">
                      {(p.name?.[0] ?? '·').toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-3 flex flex-col gap-1">
                <h3
                  className={cn(
                    typography.h4,
                    'line-clamp-2 text-[14px] text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)]',
                  )}
                >
                  {p.name}
                </h3>
                {p.organizationName && (
                  <p className="font-sans text-[12px] text-[var(--text-muted)]">
                    by {p.organizationName}
                  </p>
                )}
                {typeof p.price === 'number' &&
                  (p.currency ?? '').toUpperCase() === visitorCurrency && (
                    <p className="font-display text-[15px] font-semibold tabular-nums text-[var(--text-primary)]">
                      {fmtMinor(p.price, p.currency)}
                    </p>
                  )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </SectionDivider>
  )
}
