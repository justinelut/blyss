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
      price: (price as any)?.price_amount,
      currency: (price as any)?.price_currency,
      organizationName: (product as any).organization?.name,
    })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_ITEMS)))
  } catch { /* localStorage full or unavailable — degrade silently */ }
}

interface RecentlyViewedProps {
  /** Current product id — excluded from the list */
  currentId: string
  className?: string
}

/**
 * RecentlyViewed — 4-card horizontal scroll, client-only, localStorage.
 * Hidden on first visit per §6.5 step 7.
 */
export const RecentlyViewed = ({ currentId, className }: RecentlyViewedProps) => {
  const [items, setItems] = useState<RecentlyViewedProduct[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const all: RecentlyViewedProduct[] = JSON.parse(raw)
      setItems(all.filter((i) => i.id !== currentId).slice(0, 4))
    } catch { /* degrade silently */ }
  }, [currentId])

  if (!items.length) return null

  // Build minimal Product-shaped objects for the card
  const fakeProducts = items.map((i) => ({
    id: i.id,
    name: i.name,
    medias: i.imageUrl ? [{ public_url: i.imageUrl }] : [],
    prices: i.price != null ? [{ price_amount: i.price, price_currency: i.currency ?? 'KES' }] : [],
    organization: i.organizationName ? { name: i.organizationName } : undefined,
  })) as unknown as schemas['Product'][]

  return (
    <section className={cn('', className)}>
      <Eyebrow>Recently viewed</Eyebrow>
      <h2 className={cn(typography.h3, 'mt-3 text-[var(--text-primary)]')}>
        Seen before
      </h2>
      <div className="mt-8 flex gap-6 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:overflow-visible">
        {fakeProducts.map((p) => (
          <div key={p.id} className="w-[260px] shrink-0 md:w-auto">
            <MarketplaceProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  )
}
