'use client'

/**
 * StudioLayout — writers, researchers, technical-content creators.
 * Lab-notebook feel. Per plan §19.4.
 *
 * Differences from editorial:
 *   - No imagery in the hero. Pure type. The creator's wordmark
 *     itself IS the hero.
 *   - Numbered list for products instead of a card grid. Reads like
 *     a published index of work.
 *   - Each list row carries a short description — the page has a
 *     RSS / publication feel.
 */

import Link from 'next/link'

import { Eyebrow, typography } from '@/design'
import { schemas } from '@/lib/api'
import { cn } from '@/lib/utils'

import type {
  StorefrontHeroProps,
  StorefrontLayout,
  StorefrontWorkSectionProps,
} from './index'

const StudioHero: React.FC<StorefrontHeroProps> = ({
  name,
  slug,
  bio,
  city,
  hasSubscriptions,
  tipEnabled,
  onSubscribeClick,
  onTipClick,
}) => (
  <header className="border-b border-[var(--border)] bg-[var(--background)]">
    <div className="mx-auto max-w-[820px] px-6 py-14 md:px-12 md:py-20">
      <Eyebrow>{city ?? 'Nairobi'} · @{slug}</Eyebrow>
      <h1
        className={cn(
          typography.h2,
          'mt-4 leading-[1.05] tracking-[-0.02em] text-[var(--text-primary)]',
        )}
      >
        {name}
      </h1>
      {bio && (
        <p className="mt-6 max-w-[58ch] font-sans text-[18px] leading-[1.55] text-[var(--text-secondary)]">
          {bio}
        </p>
      )}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        {hasSubscriptions && (
          <button
            type="button"
            onClick={onSubscribeClick}
            className="inline-flex h-10 items-center rounded-md bg-[var(--accent)] px-4 font-sans text-[13px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            Subscribe
          </button>
        )}
        {tipEnabled && (
          <button
            type="button"
            onClick={onTipClick}
            className="inline-flex h-10 items-center rounded-md border border-[var(--border-strong)] bg-[var(--background)] px-4 font-sans text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-sunken)]"
          >
            Tip
          </button>
        )}
      </div>
    </div>
  </header>
)

const StudioRow: React.FC<{
  product: schemas['Product']
  index: number
}> = ({ product, index }) => (
  <Link
    href={`/products/${product.id}`}
    className="group flex items-baseline gap-6 border-b border-[var(--border)] py-6 transition-colors hover:bg-[var(--surface-sunken)]"
  >
    <span className="w-10 flex-shrink-0 font-sans text-[13px] font-semibold tabular-nums text-[var(--text-muted)]">
      {String(index + 1).padStart(2, '0')}
    </span>
    <div className="flex flex-1 flex-col gap-1 min-w-0 pr-4">
      <h3 className="font-display text-[20px] font-semibold leading-[1.25] tracking-[-0.01em] text-[var(--text-primary)] group-hover:text-[var(--accent)]">
        {product.name}
      </h3>
      {product.description && (
        <p className="line-clamp-2 max-w-[64ch] font-sans text-[14px] leading-[1.55] text-[var(--text-secondary)]">
          {product.description}
        </p>
      )}
    </div>
  </Link>
)

const StudioWorkSection: React.FC<StorefrontWorkSectionProps> = ({
  products,
  creatorName,
}) => {
  if (!products.length) {
    return (
      <section className="mx-auto max-w-[820px] px-6 py-16 md:px-12 md:py-24">
        <h2 className={cn(typography.h3, 'text-[var(--text-primary)]')}>
          {creatorName} hasn&rsquo;t published anything yet.
        </h2>
      </section>
    )
  }
  return (
    <section className="mx-auto max-w-[820px] px-6 py-10 md:px-12 md:py-16">
      <Eyebrow className="mb-2">Index</Eyebrow>
      <div className="border-t border-[var(--border)]">
        {products.map((product, i) => (
          <StudioRow key={product.id} product={product} index={i} />
        ))}
      </div>
    </section>
  )
}

export const StudioLayout: StorefrontLayout = {
  slug: 'studio',
  Hero: StudioHero,
  WorkSection: StudioWorkSection,
}
