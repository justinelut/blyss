'use client'

/* Hallmark · macrostructure: Marquee Hero v2 · genre: editorial-marketplace
 * theme: blyss-design (light cream + burnt orange #C2410C accent)
 * nav: N5/N9 (inherited) · footer: Ft5 (inherited)
 * states: default · hover · focus-visible · reduced-motion
 * contrast: pass · slop: pass (51–55, 67)
 *
 * Why v2: the v1 single-image marquee read as portfolio (Aimé Leon Dore)
 * and didn't convey "marketplace with N products from M creators" at a
 * glance. v2 keeps the editorial restraint (one headline, no trust-strip
 * shouting) but answers "what is this?" with: a concrete two-line lede,
 * a 2×2 mosaic of FOUR real products (proves breadth), and a hairline
 * stats strip below the CTA. No fakery — every number + image is real
 * from the API, sections collapse cleanly when data is sparse.
 *
 * Reference DNA: Substack publication landing (concrete value prop +
 * activity proof) + Bandcamp (real-products-first) + Aimé Leon Dore
 * (editorial restraint + tabular metadata).
 */

import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { FiArrowRight } from 'react-icons/fi'
import { schemas } from '@/lib/api'
import { Eyebrow } from '@/design'
import { cn } from '@/lib/utils'

interface HeroProps {
  /** Real products from the backend. We render up to FOUR — they fill
   *  the right-column 2×2 mosaic. Zero is fine; the mosaic falls back
   *  to creator covers, then a typographic block. */
  showcaseProducts?: schemas['Product'][]
  /** Real creators from the backend. Fills any tile the products
   *  array couldn't fill. */
  showcaseCreators?: schemas['Organization'][]
  /** Optional total-counts strip — when provided shows real numbers
   *  ("48 creators · 320 products · KSh 285K paid out"). When omitted
   *  the strip hides rather than printing zeros. */
  totals?: {
    creators?: number
    products?: number
    /** Sum of successful Paystack settlements in the smallest unit
     *  of `totalPaidOutCurrency` (kobo for KES). Drives the
     *  fourth stat tile labelled "Paid out" — proves the
     *  marketplace pays creators in real money, not promises. */
    totalPaidOut?: number
    /** ISO 4217 lowercased. Defaults to 'kes' when omitted. */
    totalPaidOutCurrency?: string
  }
}

interface MosaicTile {
  imageUrl: string
  href: string
  label: string
  alt: string
}

/**
 * Hero — Marquee macrostructure, v2.
 *
 * Layout: split-diptych. Left = type column (eyebrow + headline + lede +
 * CTA + stats strip). Right = a 2×2 mosaic of up to four real products
 * sourced from showcaseProducts (with showcaseCreators filling gaps).
 *
 * Mobile: type column on top, mosaic full-width below as a 2-col grid
 * with the same tile pattern.
 */
export const Hero = ({
  showcaseProducts = [],
  showcaseCreators = [],
  totals,
}: HeroProps) => {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })
  const parallaxY = useTransform(
    scrollYProgress,
    [0, 1],
    [0, reduce ? 0 : -50],
  )

  const ease = [0.32, 0.72, 0, 1] as const
  const headlineWords = ['Make.', 'Sell.', 'Get paid.']

  const fadeUp = (delay: number, distance = 16) =>
    reduce
      ? { initial: false, animate: { opacity: 1, y: 0 } }
      : {
          initial: { opacity: 0, y: distance },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, ease, delay },
        }

  // Build up to 4 mosaic tiles. Products take priority; creators fill
  // gaps. Anything beyond 4 is dropped — restraint over abundance.
  const tiles: MosaicTile[] = []
  for (const p of showcaseProducts) {
    if (tiles.length >= 4) break
    const img = p.medias?.[0]?.public_url
    if (!img) continue
    tiles.push({
      imageUrl: img,
      href: `/product/${p.id}`,
      label: p.name,
      alt: p.name,
    })
  }
  for (const c of showcaseCreators) {
    if (tiles.length >= 4) break
    const img =
      (c as unknown as { cover_image_url?: string | null })
        ?.cover_image_url ?? c.avatar_url
    if (!img) continue
    tiles.push({
      imageUrl: img,
      href: `/creators/${c.slug ?? c.id}`,
      label: c.name,
      alt: c.name,
    })
  }

  // Stats strip — only shown when there's at least one real number to
  // print. Zero-totals collapse the strip entirely (avoids "0 creators"
  // greeting buyers on a fresh deploy).
  const statsAvailable = !!(
    (totals?.creators && totals.creators > 0) ||
    (totals?.products && totals.products > 0) ||
    (totals?.totalPaidOut && totals.totalPaidOut > 0)
  )

  return (
    <section
      ref={ref}
      className="relative isolate overflow-hidden bg-[var(--background)]"
      aria-labelledby="home-marquee-headline"
    >
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-12 px-6 pt-10 pb-16 md:px-16 md:pt-14 md:pb-24 lg:grid-cols-12 lg:gap-16 lg:pt-16 lg:pb-32">
        {/* Type column */}
        <motion.div
          style={{ y: parallaxY }}
          className="flex flex-col lg:col-span-7"
        >
          <motion.div {...fadeUp(0.05)}>
            <Eyebrow accent>Digital products · Independent creators</Eyebrow>
          </motion.div>

          <h1
            id="home-marquee-headline"
            className="mt-6 font-display font-semibold tracking-[-0.025em] leading-[0.98] text-[clamp(48px,8vw,108px)] text-[var(--text-primary)]"
            style={{ overflowWrap: 'anywhere', minWidth: 0 }}
          >
            {headlineWords.map((word, i) => {
              const isItalic = i === 1
              return (
                <motion.span
                  key={`${word}-${i}`}
                  {...(reduce
                    ? { initial: false }
                    : {
                        initial: { opacity: 0, y: 32, rotateX: -25 },
                        animate: { opacity: 1, y: 0, rotateX: 0 },
                        transition: {
                          duration: 0.8,
                          ease,
                          delay: 0.15 + i * 0.12,
                        },
                      })}
                  className={cn(
                    'mr-3 inline-block',
                    isItalic && 'font-display italic text-[var(--accent)]',
                  )}
                  style={{ transformOrigin: 'bottom' }}
                >
                  {word}
                </motion.span>
              )
            })}
          </h1>

          {/* Lede — concrete two-line value prop. Locale-neutral so this
              reads from Lagos / Nairobi / Accra / São Paulo equally. */}
          <motion.p
            {...fadeUp(0.45)}
            className="mt-7 max-w-[44ch] font-sans text-[18px] leading-[1.55] text-[var(--text-secondary)] md:text-[20px]"
          >
            Templates, ebooks, beats, presets, and courses from independent
            creators.
            <span className="block font-medium text-[var(--text-primary)]">
              Instant download. Creators paid in 24 hours.
            </span>
          </motion.p>

          <motion.div
            {...fadeUp(0.6)}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Link
              href="/marketplace"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-7 font-sans text-[15px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              style={{ whiteSpace: 'nowrap' }}
            >
              Browse the marketplace
              <FiArrowRight
                size={16}
                aria-hidden="true"
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </Link>
            <Link
              href="/start"
              className="inline-flex h-12 items-center justify-center px-2 font-sans text-[14px] font-medium text-[var(--text-primary)] underline-offset-4 transition-colors hover:text-[var(--accent)] hover:underline"
              style={{ whiteSpace: 'nowrap' }}
            >
              Sell on Blyss →
            </Link>
          </motion.div>

          {/* Stats strip — real numbers only. Hairline rule above; eyebrow
              type below. Hidden entirely when totals are zero / unset.
              Up to four cells: Creators · Products · Paid out · Payouts (24h). */}
          {statsAvailable && (
            <motion.div
              {...fadeUp(0.75)}
              className="mt-12 grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-6 sm:grid-cols-4 max-w-[60ch]"
            >
              {totals?.creators && totals.creators > 0 ? (
                <StatCell
                  value={formatCount(totals.creators)}
                  label="Creators"
                />
              ) : null}
              {totals?.products && totals.products > 0 ? (
                <StatCell
                  value={formatCount(totals.products)}
                  label="Products"
                />
              ) : null}
              {totals?.totalPaidOut && totals.totalPaidOut > 0 ? (
                <StatCell
                  value={formatMoney(
                    totals.totalPaidOut,
                    totals.totalPaidOutCurrency ?? 'kes',
                  )}
                  label="Paid out"
                />
              ) : null}
              <StatCell value="24h" label="Payouts" />
            </motion.div>
          )}
        </motion.div>

        {/* Mosaic column */}
        <div className="relative lg:col-span-5">
          <motion.div
            {...(reduce
              ? { initial: false }
              : {
                  initial: { opacity: 0, y: 32, scale: 0.97 },
                  animate: { opacity: 1, y: 0, scale: 1 },
                  transition: { duration: 0.8, ease, delay: 0.4 },
                })}
            className="grid grid-cols-2 gap-3 sm:gap-4"
          >
            {tiles.length === 0 ? (
              // Typographic fallback when there's literally no real
              // content yet. Rare — only on a fresh deploy with no
              // products and no creators.
              <div className="col-span-2 flex aspect-[4/5] flex-col items-start justify-end overflow-hidden rounded-md bg-[var(--surface-sunken)] p-8">
                <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  No.&nbsp;0001
                </p>
                <p className="mt-4 font-display text-[clamp(28px,3.6vw,44px)] font-medium leading-[1.05] text-[var(--text-primary)]">
                  Be the first to publish.
                </p>
                <Link
                  href="/start"
                  className="mt-8 font-sans text-[13px] font-medium text-[var(--accent)] underline underline-offset-4 hover:text-[var(--accent-hover)]"
                >
                  Open your shop →
                </Link>
              </div>
            ) : (
              tiles.map((tile, i) => (
                <MosaicTile key={`${tile.href}-${i}`} tile={tile} priority={i < 2} />
              ))
            )}
          </motion.div>
        </div>
      </div>

      {/* Hairline rule under hero — separates the marquee from the body
          without a colored band, per editorial cadence. */}
      <div className="mx-auto h-px max-w-[1280px] bg-[var(--border)]" />
    </section>
  )
}

const MosaicTile: React.FC<{ tile: MosaicTile; priority: boolean }> = ({
  tile,
  priority,
}) => (
  <Link
    href={tile.href}
    className="group relative block aspect-[4/5] overflow-hidden rounded-md bg-[var(--surface-sunken)]"
    aria-label={`View ${tile.label}`}
  >
    <Image
      src={tile.imageUrl}
      alt={tile.alt}
      fill
      priority={priority}
      sizes="(min-width: 1024px) 22vw, 50vw"
      className="object-cover transition-opacity duration-300 group-hover:opacity-95"
    />
    <div className="pointer-events-none absolute inset-0 bg-[rgba(26,26,23,0)] transition-colors duration-300 group-hover:bg-[rgba(26,26,23,0.04)]" />
    <div className="pointer-events-none absolute right-0 bottom-0 left-0 px-3 pb-3">
      <p className="line-clamp-1 font-sans text-[10px] uppercase tracking-[0.12em] text-[var(--accent-foreground)] mix-blend-difference">
        {tile.label}
      </p>
    </div>
  </Link>
)

const StatCell: React.FC<{ value: string; label: string }> = ({
  value,
  label,
}) => (
  <div className="flex flex-col">
    <span className="font-display text-[22px] font-semibold tabular-nums text-[var(--text-primary)] md:text-[26px]">
      {value}
    </span>
    <span className="mt-1 font-sans text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
      {label}
    </span>
  </div>
)

const formatCount = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

/**
 * Format a "total paid out" sum from minor units to a compact display
 * string. e.g. (285_000, 'kes') → 'KSh 2.9K'.
 *
 * The hero stat tiles only have ~80px of horizontal real estate per
 * cell, so we use K/M abbreviations even on the major value. Anyone
 * who needs the exact figure can drill into the dashboard.
 */
const formatMoney = (minor: number, currency: string): string => {
  const major = (minor || 0) / 100
  const cur = (currency || 'kes').toUpperCase()
  const symbol = cur === 'KES' ? 'KSh' : cur === 'USD' ? 'US$' : cur
  return `${symbol} ${formatCount(Math.round(major))}`
}
