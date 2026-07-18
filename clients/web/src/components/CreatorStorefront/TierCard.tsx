'use client'

/* Hallmark · component: subscription-tier-card · genre: editorial
 * theme: blyss-design (warm cream + burnt orange #C2410C accent)
 *
 * One subscription tier card on the creator storefront. Wraps the inline
 * markup that used to live in SubscriptionsTab so we can call
 * useActiveSubscriptionForProduct per tier and swap the Subscribe CTA
 * for a "Manage in portal" link when the buyer is already subscribed —
 * otherwise they'd hit AlreadyActiveSubscriptionError mid-checkout.
 */

import Link from '@/components/Marketplace/LocaleLink'
import { OptimizedImage } from '@/components/Image/OptimizedImage'
import { useAuth } from '@/hooks'
import { useActiveSubscriptionForProduct } from '@/hooks/queries/subscriptions'
import { schemas } from '@/lib/api'
import { cn } from '@/lib/utils'
import { FiCheck } from 'react-icons/fi'

type Product = schemas['Product']

interface TierCardProps {
  tier: Product
  isFeatured: boolean
  amount: string
  cadence: string
  bullets: string[]
}

export const TierCard = ({
  tier,
  isFeatured,
  amount,
  cadence,
  bullets,
}: TierCardProps) => {
  const { authenticated } = useAuth()
  const { data: activeSub } = useActiveSubscriptionForProduct(
    tier.id,
    authenticated,
  )
  const isSubscribed = !!activeSub?.has_active
  const portalUrl =
    activeSub?.has_active && activeSub.organization_slug
      ? `/${activeSub.organization_slug}/portal/overview`
      : null

  const cover = (tier.medias ?? []).find((m: any) => m.public_url) as any

  return (
    <article
      aria-label={`${tier.name} subscription tier`}
      className={cn(
        'flex flex-col overflow-hidden rounded-md bg-[var(--surface-sunken)]',
        isFeatured &&
          'border-l-4 border-[var(--accent)] md:relative md:-translate-y-1',
      )}
    >
      {/* Featured image — 16:9 cover. Anchors the tier visually so
          subscriptions don't read as bare price lists. Editorial
          placeholder (initial) when the creator hasn't uploaded one. */}
      {cover ? (
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--surface)]">
          <OptimizedImage
            src={cover.public_url}
            alt={`${tier.name} cover`}
            fill
            sizes="(max-width: 768px) 100vw, 420px"
            className="object-cover"
          />
        </div>
      ) : (
        <div
          aria-hidden
          className="flex aspect-[16/9] w-full items-end bg-[var(--surface)] p-6"
        >
          <span className="font-display text-[44px] font-light leading-none text-[var(--text-muted)]">
            {(tier.name?.[0] ?? '·').toUpperCase()}
          </span>
        </div>
      )}

      <div className={cn('flex flex-1 flex-col p-8', isFeatured && 'pl-7')}>
        {/* Tier name + featured eyebrow */}
        <header className="flex items-center justify-between gap-4">
          <h3 className="font-display text-[20px] font-semibold text-[var(--text-primary)]">
            {tier.name}
          </h3>
          {isFeatured && !isSubscribed && (
            <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
              Most chosen
            </span>
          )}
          {isSubscribed && (
            <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
              You're subscribed
            </span>
          )}
        </header>

        {/* Price */}
        <div className="mt-5 flex items-baseline gap-1.5">
          <span className="font-display text-[36px] font-semibold tabular-nums text-[var(--text-primary)]">
            {amount}
          </span>
          <span className="font-sans text-[14px] text-[var(--text-muted)]">
            {cadence}
          </span>
        </div>

        {/* Tier description tagline (single sentence above bullets) */}
        {tier.description && bullets.length === 0 && (
          <p className="mt-5 font-sans text-[14px] leading-[1.55] text-[var(--text-secondary)]">
            {tier.description}
          </p>
        )}

        {/* Bullet list of benefits */}
        {bullets.length > 0 && (
          <ul className="mt-7 flex flex-1 flex-col gap-3">
            {bullets.map((bullet, idx) => (
              <li
                key={idx}
                className="flex items-start gap-3 font-sans text-[14px] leading-[1.55] text-[var(--text-secondary)]"
              >
                <FiCheck
                  size={16}
                  className="mt-1 shrink-0 text-[var(--accent)]"
                  aria-hidden="true"
                />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        )}

        {/* CTA — Subscribe (default) OR Manage in portal (when already
            subscribed). Hides the orange button entirely so the buyer
            doesn't crash into AlreadyActiveSubscriptionError mid-checkout
            and so duplicate purchase is impossible from the UI. */}
        {isSubscribed && portalUrl ? (
          <a
            href={portalUrl}
            className={cn(
              'mt-10 inline-flex h-11 items-center justify-center rounded-md px-5 font-sans text-[14px] font-medium transition-colors',
              'border border-[var(--border-strong)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--surface)]',
            )}
          >
            Manage in portal
          </a>
        ) : (
          <Link
            href={`/product/${tier.id}`}
            className={cn(
              'mt-10 inline-flex h-11 items-center justify-center rounded-md px-5 font-sans text-[14px] font-medium transition-colors',
              isFeatured
                ? 'bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)]'
                : 'border border-[var(--border-strong)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--surface)]',
            )}
          >
            Subscribe — {amount}
          </Link>
        )}
      </div>
    </article>
  )
}
