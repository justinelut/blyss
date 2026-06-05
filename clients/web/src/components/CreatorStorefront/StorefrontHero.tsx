'use client'

import { motion, useReducedMotion } from 'motion/react'
import { FiHeart } from 'react-icons/fi'
import { OptimizedImage } from '@/components/Image/OptimizedImage'
import { cn } from '@/lib/utils'

export interface StorefrontHeroProps {
  /** Creator display name */
  name: string
  /** URL slug — also used as the @handle */
  slug: string
  /** Single-line bio shown beneath the name */
  bio?: string | null
  /** Avatar (1:1) — 88px square */
  avatarUrl?: string | null
  /** Banner image (16:9 minimum 1920×1080). Falls back to a tonal block. */
  bannerUrl?: string | null
  /** City — falls back to "Nairobi" per Blyss's Kenyan voice */
  city?: string | null
  /** Whether the creator has at least one subscription tier — shows the
   *  "Subscribe" CTA when true; hides it otherwise to avoid dead links. */
  hasSubscriptions?: boolean
  /** Tip / donation enabled — shows the "Tip" CTA. v1 always renders true to
   *  match §6.4 spec; donation modal wiring is a phase-7 task. */
  tipEnabled?: boolean
  /** Optional handler for "Subscribe" CTA — typically scrolls to subs tab */
  onSubscribeClick?: () => void
  /** Optional handler for "Tip" CTA — opens donation modal */
  onTipClick?: () => void
}

/**
 * StorefrontHero — full-bleed editorial banner for /creators/[slug].
 *
 * Per plan/07-pages.md §6.4 step 1:
 * - 16:9 banner (1920×1080 min) — single tonal block fallback
 * - Bottom-left overlay: avatar (88px) + name (Inter Display 600 48px) +
 *   @handle + one-line bio + city
 * - Right side: small Subscribe button (jumps to subs tab) and Tip button
 *   (opens donation modal). Tip rendered when tipEnabled.
 *
 * Per §3.4 imagery: warm overlay, no gradients, no shadows. The dark scrim
 * over the image is a SINGLE-tone rgba block (not a gradient) sized to the
 * bottom 50% of the banner so overlay text reads while the upper half of the
 * image stays unaltered.
 *
 * Motion: banner scales 1.04 → 1.0 over 800ms on first paint; respects
 * prefers-reduced-motion.
 */
export const StorefrontHero = ({
  name,
  slug,
  bio,
  avatarUrl,
  bannerUrl,
  city,
  hasSubscriptions = false,
  tipEnabled = false,
  onSubscribeClick,
  onTipClick,
}: StorefrontHeroProps) => {
  const reduce = useReducedMotion()
  const ease = [0.32, 0.72, 0, 1] as const

  // Reveal timing for hero overlay (matches Hero.tsx home pattern)
  const bgAnim = reduce
    ? undefined
    : {
        initial: { scale: 1.04 },
        animate: { scale: 1 },
        transition: { duration: 0.8, ease },
      }
  const overlayAnim = reduce
    ? undefined
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.7, ease, delay: 0.2 },
      }

  return (
    <section
      aria-labelledby="storefront-name"
      className="relative isolate overflow-hidden bg-[var(--surface)]"
    >
      {/* Banner — 16:9 when an image is provided. When there's no image we
          render a SHORT single-tone editorial block (no scrim) to avoid the
          visual two-banner stack the dark scrim would otherwise create over
          a flat fallback color. */}
      {bannerUrl ? (
        <motion.div
          {...(bgAnim ?? {})}
          className="relative h-[280px] w-full sm:h-[340px] md:h-[400px] lg:h-[440px]"
        >
          <OptimizedImage
            src={bannerUrl}
            alt=""
            fill
            sizes="100vw"
            priority
            className="h-full w-full object-cover"
          />
          {/*
            Scrim sizing notes:
            - The banner is height-capped (not aspect-ratio driven) so the
              identity overlay (avatar + name + handle + bio + CTAs) is always
              visible above the fold on landing — previously a full-bleed
              aspect-[16/9] banner rendered ~1080px tall on desktop and pushed
              the name below the fold.
            - Mobile: full-banner darken (h-full) so the overlay text reads.
            - md+: bottom 60% darken so the photo's subject stays visible while
              the overlay still has enough contrast.
            Per §15.4, NOT a gradient — solid rgba block.
          */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-full bg-[rgba(15,14,12,0.55)] md:h-[60%]" />
        </motion.div>
      ) : (
        // No banner: a tonal block sized to the overlay's natural height.
        // No scrim, no aspect ratio. Overlay below renders in dark text.
        <div className="h-[280px] w-full bg-[var(--surface)] md:h-[240px]" />
      )}

      {/* Overlay content — anchored bottom-left of the banner via absolute
          positioning on the section. Container width matches the rest of
          the marketplace surfaces (max 1280, px-6 / md:px-16). */}
      <motion.div
        {...(overlayAnim ?? {})}
        className="absolute inset-x-0 bottom-0"
      >
        <div className="mx-auto max-w-[1280px] px-6 pb-6 md:px-16 md:pb-14">
          <div className="flex flex-col items-stretch gap-5 md:flex-row md:items-end md:justify-between md:gap-8">
            {/* Identity column. Mobile: stack vertical so the bio doesn't
                squeeze against the avatar; desktop: side-by-side aligned to
                the baseline. */}
            <div className="flex flex-col items-start gap-4 md:flex-row md:items-end md:gap-5">
              {/* Avatar 72px mobile / 88px desktop */}
              <div
                className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full bg-[var(--surface-sunken)] ring-2 ring-[var(--background)] md:h-[88px] md:w-[88px]"
              >
                <OptimizedImage
                  src={avatarUrl ?? undefined}
                  alt={`${name} avatar`}
                  fill
                  sizes="88px"
                  priority
                />
              </div>

              {/* Name + handle + bio + city. Text color depends on whether
                  a banner image is present (white over scrim) or absent
                  (dark over the tonal surface block). */}
              <div
                className={cn(
                  'min-w-0 pb-1',
                  bannerUrl ? 'text-white' : 'text-[var(--text-primary)]',
                )}
              >
                <h1
                  id="storefront-name"
                  className={cn(
                    'font-display font-semibold leading-[1.05] tracking-[-0.02em]',
                    'text-[clamp(26px,4vw,48px)]',
                  )}
                >
                  {name}
                </h1>
                <div
                  className={cn(
                    'mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-[14px]',
                    bannerUrl
                      ? 'text-white/75'
                      : 'text-[var(--text-muted)]',
                  )}
                >
                  <span
                    className={cn(
                      'font-medium',
                      bannerUrl ? 'text-white/85' : 'text-[var(--text-secondary)]',
                    )}
                  >
                    @{slug}
                  </span>
                  {city && (
                    <>
                      <span aria-hidden="true" className={bannerUrl ? 'text-white/40' : 'text-[var(--border-strong)]'}>
                        ·
                      </span>
                      <span>{city}</span>
                    </>
                  )}
                </div>
                {bio && (
                  <p
                    className={cn(
                      'mt-3 max-w-[52ch] font-sans text-[14px] leading-[1.5] md:text-[16px]',
                      bannerUrl
                        ? 'text-white/85'
                        : 'text-[var(--text-secondary)]',
                    )}
                  >
                    {bio}
                  </p>
                )}
              </div>
            </div>

            {/* CTAs — Subscribe + Tip. Full-width on mobile, inline on
                desktop. */}
            <div className="flex w-full items-center gap-3 md:w-auto">
              {hasSubscriptions && (
                <button
                  type="button"
                  onClick={onSubscribeClick}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-md bg-[var(--accent)] px-5 font-sans text-[14px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)] md:flex-none"
                >
                  Subscribe
                </button>
              )}
              {tipEnabled && (
                <button
                  type="button"
                  onClick={onTipClick}
                  className={cn(
                    'inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md px-5 font-sans text-[14px] font-medium transition-colors md:flex-none',
                    bannerUrl
                      ? 'bg-white/10 text-white backdrop-blur-md hover:bg-white/20'
                      : 'border border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[var(--surface-sunken)]',
                  )}
                >
                  <FiHeart size={16} />
                  Tip
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
