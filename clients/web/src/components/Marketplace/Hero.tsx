'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { FiArrowRight } from 'react-icons/fi'
import { schemas } from '@/lib/api'
import { Eyebrow } from '@/design'
import { cn } from '@/lib/utils'

interface HeroProps {
  /** Optional showcase products — if provided, renders real product images
   *  in the mosaic instead of typographic placeholders. */
  showcaseProducts?: schemas['Product'][]
}

/**
 * Hero — editorial split-grid homepage opener with cinematic motion.
 *
 * Layout: 7/12 content column on left, 5/12 showcase mosaic on right.
 * Mobile collapses to single column with showcase below.
 *
 * Motion (respects prefers-reduced-motion):
 * - Eyebrow fades + slides up
 * - Headline: word-by-word stagger with italic emphasis
 * - Lede + CTAs cascade in
 * - Right mosaic tiles fade up with stagger
 * - Subtle parallax on scroll for the entire section
 *
 * Per plan §3 + §6.1 + §17 (Bandcamp/Aimé Leon Dore reference).
 */
export const Hero = ({ showcaseProducts = [] }: HeroProps) => {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })
  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -80])

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

  return (
    <section
      ref={ref}
      className="relative isolate overflow-hidden bg-[var(--background)]"
    >
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-12 px-6 pt-20 pb-16 md:px-16 md:pt-32 md:pb-24 lg:grid-cols-12 lg:gap-16 lg:pt-40 lg:pb-32">
        {/* Left — content column */}
        <motion.div style={{ y: parallaxY }} className="flex flex-col lg:col-span-7">
          <motion.div {...fadeUp(0.05)}>
            <Eyebrow accent>Digital products · Nairobi</Eyebrow>
          </motion.div>

          <h1 className="mt-6 font-display font-semibold tracking-[-0.025em] leading-[0.98] text-[clamp(48px,8vw,112px)] text-[var(--text-primary)]">
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
                        transition: { duration: 0.8, ease, delay: 0.15 + i * 0.12 },
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

          <motion.p
            {...fadeUp(0.55)}
            className="mt-8 max-w-[52ch] font-sans text-[18px] leading-[1.55] text-[var(--text-secondary)] md:text-[22px]"
          >
            The modern marketplace for Kenyan creators. Templates, ebooks,
            beats, courses, subscription tiers. M-Pesa or card. Paid out within
            24&nbsp;hours.
          </motion.p>

          {/* CTA cluster */}
          <motion.div {...fadeUp(0.7)} className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/start"
              className="group inline-flex h-13 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-7 py-4 font-sans text-[15px] font-medium text-[var(--accent-foreground)] transition-all hover:bg-[var(--accent-hover)] hover:gap-3"
            >
              Start selling
              <FiArrowRight
                size={16}
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </Link>
            <Link
              href="/marketplace"
              className="group inline-flex h-13 items-center justify-center gap-1.5 px-2 py-4 font-sans text-[15px] font-medium text-[var(--text-primary)] underline-offset-8 transition-colors hover:text-[var(--accent)] hover:underline"
            >
              Browse the marketplace
            </Link>
          </motion.div>

          {/* Trust line */}
          <motion.div
            {...fadeUp(0.85)}
            className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 font-sans text-[13px] text-[var(--text-muted)]"
          >
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
              M-Pesa &amp; card
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
              20% platform fee
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
              24-hour payouts
            </span>
          </motion.div>
        </motion.div>

        {/* Right — showcase mosaic */}
        <div className="relative lg:col-span-5">
          <ShowcaseMosaic reduce={reduce ?? false} ease={ease} products={showcaseProducts} />
        </div>
      </div>
    </section>
  )
}

/**
 * ShowcaseMosaic — renders 4 product tiles. When real products are passed in,
 * uses their images. Falls back to typographic placeholders.
 */
function ShowcaseMosaic({
  reduce,
  ease,
  products,
}: {
  reduce: boolean
  ease: readonly [number, number, number, number]
  products: schemas['Product'][]
}) {
  const placeholderTiles = [
    { eyebrow: 'Templates', title: 'Notion OS', price: 'KSh 2,400', tone: 'bg-[var(--surface-sunken)]', accent: '#C2410C', span: 'col-span-2 row-span-2' },
    { eyebrow: 'Beats', title: 'Lagos Drum Kit', price: 'KSh 1,200', tone: 'bg-[var(--surface)]', accent: '#1A1A17', span: 'col-span-2' },
    { eyebrow: 'Course', title: 'M-Pesa for Devs', price: 'KSh 4,500', tone: 'dark bg-[var(--background)] text-[var(--text-primary)]', accent: '#FAFAF7', span: 'col-span-2' },
    { eyebrow: 'Subscription', title: 'Kenyan Type', price: 'KSh 800/mo', tone: 'bg-[var(--accent)] text-[var(--accent-foreground)]', accent: '#FAFAF7', span: 'col-span-2' },
  ]

  // If real products passed, render image tiles
  if (products.length >= 4) {
    // Tonal cycle for image-less tiles — varies per index so the mosaic
    // doesn't read as four identical blocks. Stays inside the Blyss palette.
    const tones = [
      'bg-[var(--surface-sunken)] text-[var(--text-primary)]',
      'bg-[var(--surface)] text-[var(--text-primary)]',
      'dark bg-[var(--background)] text-[var(--text-primary)]',
      'bg-[var(--accent)] text-[var(--accent-foreground)]',
    ] as const
    return (
      <div className="grid grid-cols-4 grid-rows-3 gap-3 md:gap-4">
        {products.slice(0, 4).map((p, i) => {
          const span = i === 0 ? 'col-span-2 row-span-2' : 'col-span-2'
          const img = p.medias?.[0]?.public_url
          const price = p.prices?.[0] as any
          const priceLabel = price
            ? `KSh ${(price.price_amount / 100).toLocaleString('en-KE')}`
            : ''
          const org = (p as any).organization
          return (
            <motion.div
              key={p.id}
              {...(reduce
                ? { initial: false }
                : {
                    initial: { opacity: 0, y: 32, scale: 0.96 },
                    animate: { opacity: 1, y: 0, scale: 1 },
                    transition: { duration: 0.7, ease, delay: 0.4 + i * 0.08 },
                  })}
              whileHover={reduce ? undefined : { y: -4 }}
              className={cn(
                'group relative aspect-[4/5] overflow-hidden rounded-md',
                img ? 'bg-[var(--surface-sunken)]' : tones[i % tones.length],
                span,
              )}
            >
              <Link href={p.id.startsWith('seed_') ? '/marketplace' : `/product/${p.id}`} className="block h-full w-full">
                {img ? (
                  <>
                    <Image
                      src={img}
                      alt={p.name}
                      fill
                      sizes="(max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-[rgba(15,14,12,0.32)]" />
                    <div className="absolute inset-0 flex flex-col justify-between p-4 text-white md:p-5">
                      <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-white/85">
                        {org?.name || 'Blyss'}
                      </span>
                      <div>
                        <h3 className="font-display text-[16px] font-medium leading-tight md:text-[18px]">
                          {p.name}
                        </h3>
                        <p className="mt-1 font-sans text-[12px] tabular-nums text-white/85">
                          {priceLabel}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Editorial typographic tile — no image */
                  <div className="absolute inset-0 flex flex-col justify-between p-4 md:p-5">
                    <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.14em] opacity-75">
                      {org?.name || 'Blyss'}
                    </span>
                    <div>
                      <h3 className="font-display text-[16px] font-medium leading-tight md:text-[18px]">
                        {p.name}
                      </h3>
                      <p className="mt-1 font-sans text-[12px] tabular-nums opacity-80">
                        {priceLabel}
                      </p>
                    </div>
                  </div>
                )}
              </Link>
            </motion.div>
          )
        })}
      </div>
    )
  }

  // Placeholder typography tiles
  return (
    <div className="grid grid-cols-4 grid-rows-3 gap-3 md:gap-4">
      {placeholderTiles.map((tile, i) => (
        <motion.div
          key={tile.title}
          {...(reduce
            ? { initial: false }
            : {
                initial: { opacity: 0, y: 32, scale: 0.96 },
                animate: { opacity: 1, y: 0, scale: 1 },
                transition: { duration: 0.7, ease, delay: 0.4 + i * 0.08 },
              })}
          whileHover={reduce ? undefined : { y: -4 }}
          className={cn(
            'group relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-md p-4',
            tile.tone,
            tile.span,
          )}
        >
          <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">
            {tile.eyebrow}
          </span>
          <div>
            <h3 className="font-display text-[18px] font-medium leading-tight">
              {tile.title}
            </h3>
            <p className="mt-1 font-sans text-[12px] tabular-nums opacity-80">
              {tile.price}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
