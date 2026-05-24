import Link from 'next/link'
import { schemas } from '@/lib/api'
import { Eyebrow, SectionDivider, typography } from '@/design'
import { OptimizedImage } from '@/components/Image/OptimizedImage'
import { cn } from '@/lib/utils'

type Subscription = schemas['Subscription']

interface FeaturedSubscriptionsProps {
  subscriptions: Subscription[]
}

const formatMonthlyPrice = (sub: Subscription): string => {
  // Subscription price model varies — try a few shapes.
  const product = (sub as any).product
  const price = product?.prices?.[0]
  if (!price) return ''
  const amount = (price as any).price_amount ?? 0
  const currency = ((price as any).price_currency ?? 'KES').toUpperCase()
  const major = amount / 100
  if (currency === 'KES') return `KSh ${major.toLocaleString('en-KE')}`
  if (currency === 'USD') return `$${major.toLocaleString('en-US')}`
  return `${major.toLocaleString()} ${currency}`
}

/**
 * FeaturedSubscriptions — 6 subscription product cards.
 *
 * Per plan §6.1 step 6: from /v1/subscriptions/public?is_featured=true&limit=6.
 * Each card shows: name, creator + small avatar, monthly price (tabular), the
 * first benefit description.
 */
export const FeaturedSubscriptions = ({ subscriptions }: FeaturedSubscriptionsProps) => {
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

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {subscriptions.slice(0, 6).map((sub) => {
          const product = (sub as any).product
          if (!product) return null
          const creator = product.organization
          const firstBenefit = product.benefits?.[0]
          const subId = (sub as any).id ?? product.id

          return (
            <Link
              key={subId}
              href={`/product/${product.id}`}
              prefetch
              className="group block rounded-md bg-[var(--surface-elevated)] p-6 transition-colors hover:bg-[var(--background)]"
            >
              <div className="flex items-start gap-3">
                {/* Creator avatar */}
                {creator?.avatar_url && (
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                    <OptimizedImage
                      src={creator.avatar_url}
                      alt={`${creator.name} avatar`}
                      fill
                      sizes="40px"
                      className="rounded-full"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3
                    className={cn(
                      typography.h4,
                      'truncate text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)]',
                    )}
                  >
                    {product.name}
                  </h3>
                  {creator?.name && (
                    <p className="mt-0.5 font-sans text-[13px] text-[var(--text-muted)]">
                      by {creator.name}
                    </p>
                  )}
                </div>
              </div>

              <p className="mt-5 font-display text-[24px] font-semibold tabular-nums text-[var(--text-primary)]">
                {formatMonthlyPrice(sub)}
                <span className="font-sans text-[14px] font-normal text-[var(--text-muted)]">
                  {' '}/ month
                </span>
              </p>

              {firstBenefit?.description && (
                <p className="mt-4 line-clamp-3 font-sans text-[14px] leading-[1.5] text-[var(--text-secondary)]">
                  {firstBenefit.description}
                </p>
              )}
            </Link>
          )
        })}
      </div>
    </SectionDivider>
  )
}
