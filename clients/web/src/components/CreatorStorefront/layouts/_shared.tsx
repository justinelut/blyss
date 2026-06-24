'use client'

/**
 * Shared bits for storefront layout heroes (gallery, catalog,
 * portfolio, studio + editorial).
 *
 * Two pieces lifted out of the per-layout heroes so they stay in
 * sync across the 5 storefront styles:
 *
 *   - <HeroStatsLine />   — Products · Sold · Earned
 *   - <HeroBio />         — bio paragraph + 'Read more' that opens
 *                           a BlyssDialog with the full text
 *
 * Editorial keeps its own customised hero (StorefrontHero.tsx) which
 * uses these formatters too — but the hero shape is custom enough
 * (fixed-height banner with absolutely-positioned overlay) that it
 * doesn't share the components.
 */

import * as React from 'react'

import {
  BlyssDialog,
  BlyssDialogBody,
  BlyssDialogEyebrow,
  BlyssDialogHeader,
  BlyssDialogTitle,
} from '@/design'
import { cn } from '@/lib/utils'

// ───────────────────────────────────────────────────────────────────
// Stats formatters
// ───────────────────────────────────────────────────────────────────

/** Compact human-readable count (12 → '12', 1500 → '1.5K', 2_000_000 → '2.0M'). */
export const formatStatCount = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

/** Compact KSh display from minor units (cents). 12700 → 'KSh 127',
 *  150000 → 'KSh 1.5K', 1_500_000 → 'KSh 15.0K' (stored as cents). */
export const formatStatMoney = (minor: number): string => {
  // Settlements are KES today; FX-aware display lands when we expand
  // beyond Kenya.
  const major = Math.round((minor || 0) / 100)
  if (major >= 1_000_000) return `KSh ${(major / 1_000_000).toFixed(1)}M`
  if (major >= 1_000) return `KSh ${(major / 1_000).toFixed(1)}K`
  return `KSh ${major}`
}

// ───────────────────────────────────────────────────────────────────
// HeroStatsLine — Products · Sold · Earned
// ───────────────────────────────────────────────────────────────────

export interface HeroStatsLineProps {
  productsCount?: number
  totalOrders?: number
  totalEarned?: number
  /** Defaults to var(--text-secondary). Pass a custom colour token when
   *  the hero sits over an image scrim. */
  className?: string
}

export const HeroStatsLine: React.FC<HeroStatsLineProps> = ({
  productsCount = 0,
  totalOrders = 0,
  totalEarned = 0,
  className,
}) => {
  const fragments: string[] = []
  if (productsCount > 0) {
    fragments.push(
      `${productsCount} ${productsCount === 1 ? 'product' : 'products'}`,
    )
  }
  if (totalOrders > 0) {
    fragments.push(`${formatStatCount(totalOrders)} sold`)
  }
  if (totalEarned > 0) {
    fragments.push(`${formatStatMoney(totalEarned)} earned`)
  }
  if (fragments.length === 0) return null
  return (
    <p
      className={cn(
        'font-sans text-[12px] tabular-nums text-[var(--text-secondary)]',
        className,
      )}
    >
      {fragments.join(' · ')}
    </p>
  )
}

// ───────────────────────────────────────────────────────────────────
// HeroBio — paragraph + 'Read more' (opens BlyssDialog)
// ───────────────────────────────────────────────────────────────────

export interface HeroBioProps {
  /** Full bio text. When falsy nothing renders. */
  bio?: string | null
  /** Creator name for the modal title. */
  name: string
  /** Soft length threshold above which the inline render truncates and
   *  shows a 'Read more' affordance. Inline copy is hard-clamped via
   *  CSS line-clamp; the threshold gates whether we even render the
   *  affordance. */
  threshold?: number
  /** Number of CSS line-clamp lines for the inline render. */
  clampLines?: 1 | 2 | 3
  /** Extra classes for the bio <p>. */
  className?: string
  /** Extra classes for the 'Read more' button. */
  buttonClassName?: string
}

export const HeroBio: React.FC<HeroBioProps> = ({
  bio,
  name,
  threshold = 140,
  clampLines = 2,
  className,
  buttonClassName,
}) => {
  const [open, setOpen] = React.useState(false)
  if (!bio) return null
  const isLong = bio.length > threshold
  const titleId = React.useId()

  const clampClass =
    clampLines === 1
      ? 'line-clamp-1'
      : clampLines === 3
        ? 'line-clamp-3'
        : 'line-clamp-2'

  return (
    <>
      <div className="flex flex-col gap-2">
        <p
          className={cn(
            'font-sans text-[14px] leading-[1.55] text-[var(--text-secondary)]',
            clampClass,
            className,
          )}
        >
          {bio}
        </p>
        {isLong && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              'self-start font-sans text-[12px] font-medium text-[var(--accent)] underline-offset-4 transition-colors hover:underline',
              buttonClassName,
            )}
          >
            Read more
          </button>
        )}
      </div>

      {/* Long-form bio — Blyss-styled dialog (paper card, warm scrim,
          smooth motion, bottom-sheet on mobile). Same component used
          by the editorial hero so the read-more affordance feels
          identical across the five layouts. */}
      <BlyssDialog
        open={open}
        onOpenChange={setOpen}
        maxWidth={640}
        titleId={titleId}
      >
        <BlyssDialogHeader>
          <BlyssDialogEyebrow>About</BlyssDialogEyebrow>
          <BlyssDialogTitle id={titleId}>{name}</BlyssDialogTitle>
        </BlyssDialogHeader>
        <BlyssDialogBody>
          <p className="whitespace-pre-line font-sans text-[15px] leading-[1.6] text-[var(--text-secondary)]">
            {bio}
          </p>
        </BlyssDialogBody>
      </BlyssDialog>
    </>
  )
}
