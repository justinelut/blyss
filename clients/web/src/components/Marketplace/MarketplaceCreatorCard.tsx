'use client'

import Link from 'next/link'
import { useReducedMotion, motion } from 'motion/react'
import { schemas } from '@/lib/api'
import { OptimizedImage } from '@/components/Image/OptimizedImage'
import { typography } from '@/design'
import { cn } from '@/lib/utils'

type Organization = schemas['Organization']

interface MarketplaceCreatorCardProps {
  creator: Organization
  /** Tall card (4:5 aspect) for featured creators on home; compact for grids */
  variant?: 'tall' | 'compact'
  className?: string
}

/** Same tonal placeholder system as MarketplaceProductCard — keeps cards
 *  visually distinct without imagery (no four-identical-avatars look). */
const TONES = [
  { bg: 'bg-[var(--surface-sunken)]', mark: 'text-[var(--text-secondary)]' },
  { bg: 'bg-[var(--surface)]', mark: 'text-[var(--text-secondary)]' },
  { bg: 'bg-[var(--surface-elevated)]', mark: 'text-[var(--text-primary)]' },
  { bg: 'bg-[var(--accent)]', mark: 'text-[var(--accent-foreground)]' },
] as const

const pickTone = (key: string) => {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return TONES[h % TONES.length]
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '·'

/**
 * MarketplaceCreatorCard — creator presentation card.
 *
 * Per plan §6.1 step 5 (Featured creators):
 * - Tall (4:5) hero image variant: avatar + name + handle + bio + product count
 * - Compact variant for /creators directory
 * - Hover: subtle 2px lift via translateY (NOT shadow)
 */
export const MarketplaceCreatorCard = ({
  creator,
  variant = 'tall',
  className,
}: MarketplaceCreatorCardProps) => {
  const reduce = useReducedMotion()
  const avatar = (creator as any).avatar_url ?? undefined
  const banner = (creator as any).profile_settings?.cover_image_url ?? undefined
  const slug = (creator as any).slug ?? creator.id
  // Seed-data placeholders use ids prefixed "seed_" — link to the creators
  // directory instead of /creators/<slug> which would 404 on an empty DB.
  const isSeed = typeof creator.id === 'string' && creator.id.startsWith('seed_')
  const profileHref = isSeed ? '/creators' : `/creators/${slug}`
  const bio = ((creator as any).bio ?? '').slice(0, 80)

  if (variant === 'compact') {
    return (
      <Link
        href={profileHref}
        prefetch
        className={cn('group block', className)}
      >
        <motion.div
          initial={false}
          whileHover={reduce ? undefined : { y: -2 }}
          transition={{ duration: reduce ? 0 : 0.2, ease: [0.32, 0.72, 0, 1] }}
          className="flex flex-col items-start gap-3 rounded-lg p-4 transition-colors hover:bg-[var(--surface-sunken)]"
        >
          <div className="relative h-24 w-24 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
            {avatar ? (
              <OptimizedImage
                src={avatar}
                alt={`${creator.name} avatar`}
                fill
                sizes="96px"
                className="rounded-full"
              />
            ) : (
              (() => {
                const tone = pickTone(creator.id)
                return (
                  <div
                    aria-hidden
                    className={cn(
                      'flex h-full w-full items-center justify-center font-display text-[28px] font-medium',
                      tone.bg,
                      tone.mark,
                    )}
                  >
                    {initials(creator.name)}
                  </div>
                )
              })()
            )}
          </div>
          <div className="min-w-0">
            <h3
              className={cn(
                typography.h4,
                'truncate text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)]',
              )}
            >
              {creator.name}
            </h3>
            {bio && (
              <p
                className={cn(
                  typography.small,
                  'mt-1 line-clamp-2 text-[var(--text-muted)]',
                )}
              >
                {bio}
              </p>
            )}
          </div>
        </motion.div>
      </Link>
    )
  }

  // Tall variant — used on home page Featured Creators
  const bannerSrc = banner ?? avatar
  const tone = pickTone(creator.id)
  const ini = initials(creator.name)
  return (
    <Link
      href={profileHref}
      prefetch
      className={cn('group block', className)}
    >
      <motion.div
        initial={false}
        whileHover={reduce ? undefined : { y: -2 }}
        transition={{ duration: reduce ? 0 : 0.25, ease: [0.32, 0.72, 0, 1] }}
        className="relative flex flex-col"
      >
        {/* Banner image (4:5 aspect) — typographic placeholder when no media */}
        <div className="relative w-full overflow-hidden rounded-md bg-[var(--surface-sunken)]">
          {bannerSrc ? (
            <>
              <OptimizedImage
                src={bannerSrc}
                alt={`${creator.name} — creator banner`}
                fill
                aspectRatio="4/5"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className="rounded-md"
              />
              {/* Gentle warm overlay on banner per §3.4 imagery treatment */}
              <div className="pointer-events-none absolute inset-0 rounded-md bg-[rgba(26,26,23,0.04)] mix-blend-multiply" />
              {/* Avatar overlay bottom-left */}
              <div className="absolute bottom-4 left-4 flex items-end gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-[var(--surface-elevated)] bg-[var(--surface-sunken)]">
                  {avatar ? (
                    <OptimizedImage
                      src={avatar}
                      alt={`${creator.name} avatar`}
                      fill
                      sizes="56px"
                      className="rounded-full"
                    />
                  ) : (
                    <div
                      aria-hidden
                      className={cn(
                        'flex h-full w-full items-center justify-center font-display text-[16px] font-medium',
                        tone.bg,
                        tone.mark,
                      )}
                    >
                      {ini}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div
              aria-hidden
              className={cn(
                'relative flex aspect-[4/5] w-full flex-col justify-between rounded-md p-5 md:p-6',
                tone.bg,
              )}
            >
              <span
                className={cn(
                  'font-display text-[56px] font-light leading-none md:text-[72px]',
                  tone.mark,
                )}
              >
                {ini}
              </span>
              <p className={cn('font-display text-[15px] font-medium', tone.mark)}>
                {creator.name}
              </p>
            </div>
          )}
        </div>

        {/* Name + bio below image */}
        <div className="mt-4 flex flex-col gap-1">
          <h3
            className={cn(
              typography.h4,
              'text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)]',
            )}
          >
            {creator.name}
          </h3>
          {bio && (
            <p className={cn(typography.small, 'line-clamp-2 text-[var(--text-muted)]')}>
              {bio}
            </p>
          )}
        </div>
      </motion.div>
    </Link>
  )
}
