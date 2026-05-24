'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { Eyebrow } from '@/design'
import { cn } from '@/lib/utils'

interface HeroProps {
  /** Optional background image URL — falls back to a tonal hero block */
  backgroundImage?: string
}

/**
 * Hero — homepage opener.
 *
 * Per plan §6.1 step 2:
 * - Full-bleed background (image OR --surface tone fallback)
 * - Eyebrow: "DIGITAL PRODUCTS · NAIROBI"
 * - Headline: "Make. Sell. Get paid." (italic on one word for emphasis)
 * - Lede: max 60ch, Inter 22px
 * - Single primary CTA "Start selling" — NO secondary CTA above the fold
 * - NO scroll-down arrow (per anti-pattern checklist)
 *
 * Motion sequence (skipped if prefers-reduced-motion):
 * - Eyebrow fades up at 200ms
 * - Headline word-by-word stagger over 300ms
 * - Lede + CTA together at 500ms
 * - Background image scales 1.04 → 1.0 over 800ms
 */
export const Hero = ({ backgroundImage }: HeroProps) => {
  const reduce = useReducedMotion()

  const headlineWords = ['Make.', 'Sell.', 'Get paid.']

  // Animation orchestration via stagger; respects reduced motion.
  const ease = [0.32, 0.72, 0, 1] as const
  const eyebrowAnim = reduce
    ? undefined
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6, ease, delay: 0.05 },
      }
  const wordAnim = (i: number) =>
    reduce
      ? undefined
      : {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, ease, delay: 0.2 + i * 0.12 },
        }
  const ledeAnim = reduce
    ? undefined
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.7, ease, delay: 0.55 },
      }
  const bgAnim = reduce
    ? undefined
    : {
        initial: { scale: 1.04 },
        animate: { scale: 1 },
        transition: { duration: 0.8, ease },
      }

  return (
    <section className="relative isolate overflow-hidden bg-[var(--surface)]">
      {/* Background — image if provided, otherwise a single tonal block */}
      <motion.div
        {...(bgAnim ?? {})}
        className="absolute inset-0 -z-10"
      >
        {backgroundImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={backgroundImage}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover"
          />
        ) : (
          // Fallback editorial block — warm tonal gradient (NO color gradient,
          // just a single tone with subtle vignette via inset shadow alternative)
          <div className="h-full w-full bg-[var(--surface)]" />
        )}
        {/* Warm overlay to keep text legibility on any image */}
        {backgroundImage && (
          <div className="absolute inset-0 bg-[rgba(26,26,23,0.18)]" />
        )}
      </motion.div>

      {/* Content */}
      <div className="mx-auto max-w-[1280px] px-6 py-24 md:px-16 md:py-40 lg:py-48">
        <div className="max-w-[20ch]">
          <motion.div {...(eyebrowAnim ?? {})}>
            <Eyebrow accent={!backgroundImage}>
              {backgroundImage ? (
                <span className="text-white/80">Digital products · Nairobi</span>
              ) : (
                'Digital products · Nairobi'
              )}
            </Eyebrow>
          </motion.div>

          <h1
            className={cn(
              'mt-6 font-display font-semibold tracking-[-0.025em] leading-[1.02]',
              'text-[clamp(48px,7vw,96px)]',
              backgroundImage ? 'text-white' : 'text-[var(--text-primary)]',
            )}
          >
            {headlineWords.map((word, i) => (
              <motion.span
                key={`${word}-${i}`}
                {...(wordAnim(i) ?? {})}
                className="mr-3 inline-block"
              >
                {/* Italicize the middle word for emphasis */}
                {i === 1 ? <em className="font-display italic">{word}</em> : word}
              </motion.span>
            ))}
          </h1>

          <motion.p
            {...(ledeAnim ?? {})}
            className={cn(
              'mt-8 max-w-[60ch] font-sans text-[20px] leading-[1.5] md:text-[22px]',
              backgroundImage ? 'text-white/85' : 'text-[var(--text-secondary)]',
            )}
          >
            The modern marketplace for Kenyan creators. Templates, ebooks,
            beats, courses, subscription tiers. M-Pesa or card. Paid out within
            24&nbsp;hours.
          </motion.p>

          <motion.div
            {...(ledeAnim ?? {})}
            className="mt-10"
          >
            <Link
              href="/start"
              className="inline-flex h-12 items-center justify-center rounded-md bg-[var(--accent)] px-7 font-sans text-[15px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
            >
              Start selling
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
