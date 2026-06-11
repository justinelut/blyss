'use client'

import { schemas } from '@/lib/api'
import { typography } from '@/design'
import { cn } from '@/lib/utils'
import { TierCard } from './TierCard'

type Product = schemas['Product']
type ProductPrice = Product['prices'][number]

export interface SubscriptionsTabProps {
  /** All recurring (is_recurring=true) products by this creator. Treated as
   *  subscription tiers. The middle tier (or only tier) is featured. */
  tiers: Product[]
  /** Display name — used in the empty-state copy */
  creatorName: string
  /** Whether the storefront has any one-time work — used in the empty-state
   *  copy for context. */
  hasOtherWork?: boolean
}

const formatMonthlyPrice = (product: Product): { amount: string; cadence: string } => {
  const price = product.prices?.[0] as ProductPrice | undefined
  if (!price) return { amount: '—', cadence: '/ month' }

  // Polar's price types vary — defensively read amount + currency.
  const amountMinor = (price as any).price_amount ?? 0
  const currency = ((price as any).price_currency ?? 'KES').toUpperCase()
  const major = amountMinor / 100

  const formatted =
    currency === 'KES'
      ? `KSh ${major.toLocaleString('en-KE')}`
      : currency === 'USD'
        ? `US$ ${major.toLocaleString('en-US')}`
        : `${currency} ${major.toLocaleString()}`

  // Cadence — recurring_interval is "month" or "year"
  const interval = product.recurring_interval ?? 'month'
  const count = product.recurring_interval_count ?? 1
  const unit = interval === 'year' ? 'year' : 'month'
  const cadence =
    count === 1 ? `/ ${unit}` : `/ ${count} ${unit}s`

  return { amount: formatted, cadence }
}

/**
 * Pull the first three "benefit-like" lines from a product. We surface up
 * to 3 in the tier card per spec. Order of preference:
 *   1) Polar Benefit objects attached to the product (description string)
 *   2) The product description itself, split on newlines
 *   3) Empty list — caller renders an editorial fallback line
 */
const getTierBullets = (product: Product, max = 3): string[] => {
  // 1) Benefits attached to the product
  const benefits = product.benefits ?? []
  const fromBenefits = benefits
    .map((b: any) => (b.description ?? b.name ?? '').trim())
    .filter((s: string) => s.length > 0)

  if (fromBenefits.length > 0) return fromBenefits.slice(0, max)

  // 2) Product description — first non-empty lines
  const desc = (product.description ?? '').trim()
  if (desc) {
    return desc
      .split(/\n+/)
      .map((l) => l.replace(/^[-*•]\s*/, '').trim())
      .filter((l) => l.length > 0 && l.length <= 140)
      .slice(0, max)
  }

  return []
}

/**
 * SubscriptionsTab — 1-3 subscription tiers in a horizontal row.
 *
 * Per plan/07-pages.md §6.4 step 4:
 * - 1-3 tiers in a horizontal row (single column on mobile)
 * - Each tier shows: name, monthly KES price (tabular), "X subscribers",
 *   first 3 benefits as bullets (markdown-rendered when provided), Subscribe
 *   CTA
 * - Cards have NO shadow — surface-sunken background only
 * - Featured tier has a thin --accent left border 4px wide
 *
 * "Subscriber count" isn't exposed on the public Product schema in v1; we
 * omit the stat rather than fabricate one (per §15.4 anti-pattern).
 */
export const SubscriptionsTab = ({
  tiers,
  creatorName,
  hasOtherWork,
}: SubscriptionsTabProps) => {
  if (!tiers.length) {
    return (
      <section className="mx-auto max-w-[1280px] px-6 py-16 md:px-16 md:py-24">
        <div className="max-w-[48ch]">
          <h2 className={cn(typography.h3, 'text-[var(--text-primary)]')}>
            No subscription tiers yet.
          </h2>
          <p
            className={cn(
              typography.body,
              'mt-4 text-[var(--text-secondary)]',
            )}
          >
            {creatorName} doesn&rsquo;t offer recurring subscriptions today.
            {hasOtherWork
              ? ' Their one-off work is on the All work tab.'
              : ' Check back soon — new tiers go live as creators set them up.'}
          </p>
        </div>
      </section>
    )
  }

  // Featured tier: middle one when there are 3, otherwise the first.
  const featuredIndex = tiers.length === 3 ? 1 : 0

  // Layout columns: 1 / 2 / 3 wide based on tier count.
  const columnsClass =
    tiers.length === 1
      ? 'grid-cols-1 max-w-[420px]'
      : tiers.length === 2
        ? 'grid-cols-1 md:grid-cols-2 max-w-[860px]'
        : 'grid-cols-1 md:grid-cols-3'

  return (
    <section className="mx-auto max-w-[1280px] px-6 py-12 md:px-16 md:py-16">
      <div className={cn('mx-auto grid gap-6', columnsClass)}>
        {tiers.map((tier, i) => {
          const isFeatured = i === featuredIndex && tiers.length > 1
          const { amount, cadence } = formatMonthlyPrice(tier)
          const bullets = getTierBullets(tier, 3)

          return (
            <TierCard
              key={tier.id}
              tier={tier}
              isFeatured={isFeatured}
              amount={amount}
              cadence={cadence}
              bullets={bullets}
            />
          )
        })}
      </div>
    </section>
  )
}
