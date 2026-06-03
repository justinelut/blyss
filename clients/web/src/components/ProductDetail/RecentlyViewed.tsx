'use client'

import { useEffect, useState } from 'react'
import { schemas } from '@/lib/api'
import { MarketplaceProductCard } from '@/components/Marketplace/MarketplaceProductCard'
import { Eyebrow, typography } from '@/design'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'blyss_recently_viewed'
const MAX_ITEMS = 8

export interface RecentlyViewedProduct {
  id: string
  name: string
  imageUrl?: string
  price?: number
  currency?: string
  organizationName?: string
}

/**
 * Records a product view into localStorage.
 * Call this from the page component on mount.
 */
export function recordProductView(product: schemas['Product']) {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const items: RecentlyViewedProduct[] = raw ? JSON.parse(raw) : []
    const filtered = items.filter((i) => i.id !== product.id)
    const price = product.prices?.[0]
    filtered.unshift({
      id: product.id,
      name: product.name,
      imageUrl: product.medias?.[0]?.public_url ?? undefined,
      price: (price as { price_amount?: number } | undefined)?.price_amount,
      currency: (price as { price_currency?: string } | undefined)
        ?.price_currency,
      organizationName: (product as unknown as { organization?: { name?: string } })
        .organization?.name,
    })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_ITEMS)))
  } catch {
    /* localStorage full or unavailable — degrade silently */
  }
}

interface RecentlyViewedProps {
  /** Current product id — excluded from the list */
  currentId: string
  className?: string
}

/**
 * RecentlyViewed — up to 4 recently-viewed cards on desktop, snap-scrolling
 * carousel on mobile. Client-only (sourced from localStorage). Hidden on
 * first visit per plan §6.5 step 7.
 *
 * The section is hairline-divided to match RelatedProducts above and uses
 * the same editorial section header rhythm so the two stack cleanly.
 */
export const RecentlyViewed = ({ currentId, className }: RecentlyViewedProps) => {
  const [items, setItems] = useState<RecentlyViewedProduct[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const all: RecentlyViewedProduct[] = JSON.parse(raw)
      setItems(all.filter((i) => i.id !== currentId).slice(0, 4))
    } catch {
      /* degrade silently */
    }
  }, [currentId])

  if (!items.length) return null

  // Build minimal Product-shaped objects for the card.
  const fakeProducts = items.map((i) => ({
    id: i.id,
    name: i.name,
    medias: i.imageUrl ? [{ public_url: i.imageUrl }] : [],
    prices:
      i.price != null
        ? [{ price_amount: i.price, price_currency: i.currency ?? 'KES' }]
        : [],
    organization: i.organizationName ? { name: i.organizationName } : undefined,
  })) as unknown as schemas['Product'][]

  return (
    <section
      aria-labelledby="recently-viewed-heading"
      className={cn('border-t border-[var(--border)] pt-12 md:pt-16', className)}
    >
      <header className="flex items-end justify-between gap-6">
        <div>
          <Eyebrow>Recently viewed</Eyebrow>
          <h2
            id="recently-viewed-heading"
            className={cn(typography.h3, 'mt-3 text-[var(--text-primary)]')}
          >
            Picking up where you left off.
          </h2>
        </div>
        <p className="font-sans text-[13px] tabular-nums text-[var(--text-muted)]">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </p>
      </header>

      <div className="mt-10 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2 [scrollbar-width:none] md:grid md:grid-cols-4 md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden">
        {fakeProducts.map((p) => (
          <div
            key={p.id}
            className="w-[260px] shrink-0 snap-start md:w-auto"
          >
            <MarketplaceProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  )
}
