'use client'

/* Hallmark · macrostructure: Marquee Hero · genre: editorial
 * theme: blyss-design (light cream + burnt orange #C2410C accent)
 * nav: N5/N9 (inherited) · footer: Ft5 (inherited)
 * states: default · hover · focus-visible · reduced-motion
 * contrast: pass · slop: pass (51–55, 67)
 *
 * Reference DNA: Aimé Leon Dore home — single confident statement + a single
 * 4:5 editorial image. NO trust strip in the hero (gate 9 territory). NO
 * mosaic of competing tiles. NO secondary lede paragraph. The marquee IS the
 * hero. Supporting content lives below the fold (NoteFromMakers, HowItWorks).
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
  /** Real products from the backend. We render at most ONE — the first
   *  product becomes the marquee image. No mosaic. */
  showcaseProducts?: schemas['Product'][]
  /** Real creators from the backend. Only used when there are zero products
   *  — first creator's avatar/cover becomes the marquee image. */
  showcaseCreators?: schemas['Organization'][]
}

/**
 * Hero — Marquee macrostructure.
 *
 * Layout: split-diptych. Left = type column (eyebrow + headline + single CTA).
 * Right = a single 4:5 editorial image, sourced from the first available
 * real product. If none exists, falls back to the first creator's cover, or
 * to a typographic block when neither exists. No fake imagery, no mosaic.
 *
 * Mobile: type column on top, image full-width below.
 */
export const Hero = ({
  showcaseProducts = [],
  showcaseCreators = [],
}: HeroProps) => {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })
  // Keep the parallax — it's restrained (≤80px) and respects reduced motion.
  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -60])

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

  // Pick the single marquee image source: first product image > first
  // creator's cover/avatar > nothing (typographic-only fallback).
  const heroProduct = showcaseProducts[0]
  const heroProductImage = heroProduct?.medias?.[0]?.public_url ?? null
  const heroCreator = showcaseCreators[0]
  const heroCreatorImage =
    (heroCreator as unknown as { cover_image_url?: string | null })
      ?.cover_image_url ??
    heroCreator?.avatar_url ??
    null
  const heroImage = heroProductImage || heroCreatorImage
  const heroImageAlt =
    heroProduct?.name ??
    heroCreator?.name ??
    'Blyss — the marketplace for independent creators'
  const heroLink = heroProduct
    ? `/product/${heroProduct.id}`
    : heroCreator
      ? `/creators/${heroCreator.slug ?? heroCreator.id}`
      : '/marketplace'

  return (
    <section
      ref={ref}
      className="relative isolate overflow-hidden bg-[var(--background)]"
      aria-labelledby="home-marquee-headline"
    >
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-12 px-6 pt-10 pb-20 md:px-16 md:pt-14 md:pb-28 lg:grid-cols-12 lg:gap-20 lg:pt-16 lg:pb-36">
        {/* Type column — the marquee */}
        <motion.div
          style={{ y: parallaxY }}
          className="flex flex-col lg:col-span-7"
        >
          <motion.div {...fadeUp(0.05)}>
            <Eyebrow accent>Digital products · Independent creators</Eyebrow>
          </motion.div>

          <h1
            id="home-marquee-headline"
            className="mt-6 font-display font-semibold tracking-[-0.025em] leading-[0.98] text-[clamp(48px,8vw,112px)] text-[var(--text-primary)]"
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

          {/* Single CTA — Browse, not Sell. Most home visitors are buyers;
              the header carries the "Start selling" link for creators. */}
          <motion.div {...fadeUp(0.55)} className="mt-12 flex items-center">
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
          </motion.div>
        </motion.div>

        {/* Image column — single 4:5 marquee tile */}
        <div className="relative lg:col-span-5">
          <motion.div
            {...(reduce
              ? { initial: false }
              : {
                  initial: { opacity: 0, y: 32, scale: 0.97 },
                  animate: { opacity: 1, y: 0, scale: 1 },
                  transition: { duration: 0.8, ease, delay: 0.4 },
                })}
            className="relative aspect-[4/5] w-full overflow-hidden rounded-md bg-[var(--surface-sunken)]"
          >
            {heroImage ? (
              <Link
                href={heroLink}
                className="group relative block h-full w-full"
                aria-label={
                  heroProduct
                    ? `View ${heroProduct.name}`
                    : heroCreator
                      ? `View ${heroCreator.name}`
                      : 'Browse the marketplace'
                }
              >
                <Image
                  src={heroImage}
                  alt={heroImageAlt}
                  fill
                  priority
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover transition-opacity duration-300 group-hover:opacity-95"
                />
                {/* Subtle multiply overlay on hover — never scale. */}
                <div className="pointer-events-none absolute inset-0 bg-[rgba(26,26,23,0)] transition-colors duration-300 group-hover:bg-[rgba(26,26,23,0.04)]" />
                {/* Caption strip at the bottom — eyebrow-style, bottom-anchored */}
                <div className="absolute right-0 bottom-0 left-0 px-6 pb-6">
                  <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-[var(--accent-foreground)] mix-blend-difference">
                    {heroProduct
                      ? heroProduct.name
                      : heroCreator
                        ? heroCreator.name
                        : 'Featured'}
                  </p>
                </div>
              </Link>
            ) : (
              // Typographic fallback when there's literally no real content yet.
              <div className="flex h-full w-full flex-col items-start justify-end p-8">
                <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  No.&nbsp;0001
                </p>
                <p
                  className={cn(
                    'mt-4 font-display text-[clamp(28px,3.6vw,44px)] font-medium leading-[1.05] text-[var(--text-primary)]',
                  )}
                  style={{ overflowWrap: 'anywhere', minWidth: 0 }}
                >
                  Be the first to publish.
                </p>
                <Link
                  href="/start"
                  className="mt-8 font-sans text-[13px] font-medium text-[var(--accent)] underline underline-offset-4 hover:text-[var(--accent-hover)]"
                >
                  Open your shop &rarr;
                </Link>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Hairline rule under hero — separates the marquee from the body
          without a colored band, per editorial cadence (no shadow, no gradient). */}
      <div className="mx-auto h-px max-w-[1280px] bg-[var(--border)]" />
    </section>
  )
}
