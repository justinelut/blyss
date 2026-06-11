'use client'

import Link from 'next/link'
import { schemas } from '@/lib/api'
import { Eyebrow, SectionDivider, typography } from '@/design'
import { OptimizedImage } from '@/components/Image/OptimizedImage'
import { cn } from '@/lib/utils'
import { useDisplayCurrency } from './CurrencyProvider'
import { findPriceForCurrency } from '@/lib/currency/marketplace'

type Product = schemas['Product']

interface FeaturedSubscriptionsProps {
  /**
   * Items returned by `GET /v1/subscriptions/public` — these are subscription-type
   * products (recurring_interval is set), not actual customer subscription records.
   * Renamed prop kept for back-compat with existing callers.
   */
  subscriptions: Product[]
}

const formatMonthlyPrice = (product: Product, preferredCurrency: string): string => {
  // Prefer the visitor-currency price; the feed is already filtered to it.
  const price =
    (findPriceForCurrency(product, preferredCurrency) as any) ??
    (product as any).prices?.[0]
  if (!price) return ''
  const amount = price.price_amount ?? 0
  const currency = (price.price_currency ?? 'KES').toUpperCase()
  const major = amount / 100
  if (currency === 'KES') return `KSh ${major.toLocaleString('en-KE')}`
  if (currency === 'USD') return `US$ ${major.toLocaleString('en-US')}`
  return `${currency} ${major.toLocaleString()}`
}

/** Cadence suffix from the product's recurring interval ("/ month", "/ year",
 *  "/ 3 months"). Avoids hardcoding "/ month" for yearly tiers. */
const cadenceLabel = (product: Product): string => {
  const interval = (product as any).recurring_interval ?? 'month'
  const count = (product as any).recurring_interval_count ?? 1
  const unit = interval === 'year' ? 'year' : 'month'
  return count === 1 ? `/ ${unit}` : `/ ${count} ${unit}s`
}

/**
 * FeaturedSubscriptions — 6 subscription-product cards.
 *
 * Pulls from `/v1/subscriptions/public?is_featured=true&limit=6` (public, no
 * auth, no PII). Each card shows: name, creator + small avatar, monthly price
 * (tabular), and the first benefit description if present.
 */
export const FeaturedSubscriptions = ({ subscriptions }: FeaturedSubscriptionsProps) => {
  const displayCurrency = useDisplayCurrency()
  if (!subscriptions?.length) return null

  return (
    <SectionDivider tone="sunken" density="lg">
      <div className="mb-12 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Eyebrow>Recurring access</Eyebrow>
          <h2 className={cn(typography.h2, 'mt-3 text-[var(--text-primary)]')}>
            Subscriptions worth it.
          </h2>
        </div>
        <Link
          href="/marketplace?type=subscription"
          className="font-sans text-sm text-[var(--text-secondary)] underline-offset-4 transition-colors hover:text-[var(--accent)] hover:underline"
        >
          All subscriptions →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {subscriptions.slice(0, 6).map((product) => {
          const creator = (product as any).organization
          const cover = (product.medias ?? []).find(
            (m: any) => m.public_url,
          ) as any

          const isSeed =
            typeof product.id === 'string' && product.id.startsWith('seed_')
          // Editorial card — no chrome, no shadow, image-led. The cover
          // sits on the section background; on hover the image scales 1.04
          // and the title takes the accent color (Aimé Leon Dore /
          // Are.na pattern). Per-§3.4 anti-slop: no drop-shadow boxes, no
          // gradients, no badge pills.
          return (
            <Link
              key={product.id}
              href={isSeed ? '/marketplace?type=subscription' : `/product/${product.id}`}
              prefetch
              aria-label={`${product.name} — Subscription by ${creator?.name ?? 'Creator'}`}
              className="group block"
            >
              {/* 16:9 cover. Editorial typographic placeholder when no
                  cover is uploaded. Hover overlay is the warm Blyss
                  multiply tint, never a black gradient. */}
              <div className="relative w-full overflow-hidden rounded-md bg-[var(--surface-sunken)]">
                {cover ? (
                  <div className="relative aspect-[16/9] w-full overflow-hidden">
                    <div className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.04]">
                      <OptimizedImage
                        src={cover.public_url}
                        alt={`${product.name} cover`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover"
                      />
                    </div>
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 mix-blend-multiply"
                      style={{
                        backgroundColor: 'rgba(26, 26, 23, 0.04)',
                      }}
                    />
                  </div>
                ) : (
                  <div
                    aria-hidden
                    className="relative flex aspect-[16/9] w-full items-end p-6 md:p-8"
                  >
                    <span className="font-display text-[44px] font-light leading-none text-[var(--text-muted)] md:text-[56px]">
                      {(product.name?.[0] ?? '·').toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Info — outside the cover, no card chrome */}
              <div className="mt-5 flex flex-col gap-2">
                <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                  Subscription
                </p>
                <h3
                  className={cn(
                    typography.h4,
                    'line-clamp-2 text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)]',
                  )}
                >
                  {product.name}
                </h3>
                {creator?.name && (
                  <p className="font-sans text-[13px] text-[var(--text-muted)]">
                    by {creator.name}
                  </p>
                )}
                <p className="mt-1 flex items-baseline gap-1.5 font-display text-[20px] font-semibold tabular-nums text-[var(--text-primary)]">
                  <span>{formatMonthlyPrice(product, displayCurrency)}</span>
                  <span className="font-sans text-[13px] font-normal text-[var(--text-muted)]">
                    {cadenceLabel(product)}
                  </span>
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </SectionDivider>
  )
}
