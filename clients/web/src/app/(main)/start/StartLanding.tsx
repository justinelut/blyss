'use client'

/* Hallmark · macrostructure: Manifesto · genre: editorial
 * theme: blyss-design (light cream + burnt orange #C2410C accent)
 * sections: Position statement · Three editorial points · Single CTA
 * nav: N9 (inherited) · footer: Ft1 (inherited)
 * contrast: pass · slop: pass (gates 1, 2, 7, 8, 36, 56, 67)
 *
 * Reference DNA: brand-voice page — Aimé Leon Dore "About" + manifesto
 * patterns. NOT a feature grid, NOT a stat-led page. The brief positions
 * Blyss to the Kenyan creator considering selling.
 */

import { motion, useReducedMotion } from 'motion/react'
import Link from 'next/link'
import { FiArrowRight, FiCheck } from 'react-icons/fi'
import { Eyebrow, typography } from '@/design'
import { cn } from '@/lib/utils'

/**
 * StartLanding — editorial pre-onboarding landing at /start.
 *
 * 3-section layout:
 * 1. Hero with single CTA → /dashboard/create (Polar's existing onboarding)
 * 2. "What sells" 6-tile category grid
 * 3. Why Blyss (3-bullet feature list with motion)
 *
 * Designed to convert curious creators in <10 seconds.
 */
export const StartLanding = () => {
  const reduce = useReducedMotion()
  const ease = [0.32, 0.72, 0, 1] as const

  const fadeUp = (delay: number) =>
    reduce
      ? { initial: false, animate: { opacity: 1, y: 0 } }
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, ease, delay },
        }

  const crafts = [
    { name: 'Templates', desc: 'Notion, Figma, Airtable workspaces' },
    { name: 'Beats & Samples', desc: 'Drum kits, loops, vocal chops' },
    { name: 'Courses', desc: 'Self-paced lessons + certificates' },
    { name: 'Ebooks', desc: 'PDFs, EPUBs, illustrated stories' },
    { name: 'Presets', desc: 'Lightroom, Capture One, LUTs' },
    { name: 'Subscriptions', desc: 'Recurring tiers + member-only drops' },
  ]

  const whys = [
    {
      title: '20% platform fee. No subscription.',
      body: 'You only pay when you sell. Compare to Gumroad\'s 10% + 30¢ + their unrelated charges, or Patreon\'s 8-12% + processor fees on top.',
    },
    {
      title: 'M-Pesa first. 24-hour payouts.',
      body: 'Buyers pay with M-Pesa or card via Paystack. Your money lands within 24 hours, directly to your registered M-Pesa number or bank.',
    },
    {
      title: 'Built like a magazine, not a Shopify theme.',
      body: 'Editorial-grade product pages, motion that respects user attention, real Kenyan typography. Your work deserves better than templates.',
    },
  ]

  return (
    <div className="bg-[var(--background)] text-[var(--text-primary)]">
      {/* Hero */}
      <section className="mx-auto max-w-[1280px] px-6 pt-24 pb-16 md:px-16 md:pt-40 md:pb-24">
        <motion.div {...fadeUp(0)}>
          <Eyebrow accent>Start selling · 10 minutes</Eyebrow>
        </motion.div>

        <motion.h1
          {...fadeUp(0.1)}
          className="mt-6 max-w-[18ch] font-display font-semibold tracking-[-0.025em] leading-[0.98] text-[clamp(48px,7vw,96px)]"
        >
          Your storefront,{' '}
          <em className="not-italic text-[var(--accent)]">live by lunch</em>.
        </motion.h1>

        <motion.p
          {...fadeUp(0.25)}
          className="mt-8 max-w-[56ch] font-sans text-[18px] leading-[1.55] text-[var(--text-secondary)] md:text-[22px]"
        >
          Pick a handle. Upload your work. Set a price. Share the link. M-Pesa
          and card payments come built-in. Payouts within 24 hours.
        </motion.p>

        <motion.div {...fadeUp(0.4)} className="mt-12 flex flex-wrap items-center gap-4">
          <Link
            href="/dashboard/create"
            className="group inline-flex h-13 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-7 py-4 font-sans text-[15px] font-medium text-[var(--accent-foreground)] transition-all hover:bg-[var(--accent-hover)] hover:gap-3"
          >
            Create your storefront
            <FiArrowRight
              size={16}
              className="transition-transform duration-300 group-hover:translate-x-0.5"
            />
          </Link>
          <Link
            href="/marketplace"
            className="inline-flex h-13 items-center justify-center px-2 py-4 font-sans text-[15px] font-medium text-[var(--text-primary)] underline-offset-8 transition-colors hover:text-[var(--accent)] hover:underline"
          >
            See what others are selling
          </Link>
        </motion.div>
      </section>

      {/* What sells */}
      <section className="bg-[var(--surface)]">
        <div className="mx-auto max-w-[1280px] px-6 py-16 md:px-16 md:py-24">
          <motion.div initial={reduce ? false : { opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-15%' }} transition={{ duration: 0.6, ease }}>
            <Eyebrow>What sells on Blyss</Eyebrow>
            <h2 className={cn(typography.h2, 'mt-3 max-w-[18ch] text-[var(--text-primary)]')}>
              Anything you can deliver as a file or a link.
            </h2>
          </motion.div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {crafts.map((c, i) => (
              <motion.article
                key={c.name}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-10%' }}
                transition={{ duration: 0.5, ease, delay: i * 0.06 }}
                whileHover={reduce ? undefined : { y: -4 }}
                className="group rounded-md bg-[var(--surface-elevated)] p-6 transition-shadow"
              >
                <h3 className="font-display text-[20px] font-semibold text-[var(--text-primary)]">
                  {c.name}
                </h3>
                <p className="mt-2 font-sans text-[14px] leading-[1.5] text-[var(--text-secondary)]">
                  {c.desc}
                </p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Why Blyss */}
      <section className="mx-auto max-w-[1280px] px-6 py-20 md:px-16 md:py-32">
        <motion.div initial={reduce ? false : { opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-15%' }} transition={{ duration: 0.6, ease }}>
          <Eyebrow accent>Why Blyss</Eyebrow>
          <h2 className={cn(typography.h2, 'mt-3 max-w-[16ch] text-[var(--text-primary)]')}>
            Built for the way Kenyan creators actually sell.
          </h2>
        </motion.div>

        <ul className="mt-16 grid grid-cols-1 gap-12 lg:grid-cols-3 lg:gap-10">
          {whys.map((w, i) => (
            <motion.li
              key={w.title}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-10%' }}
              transition={{ duration: 0.6, ease, delay: i * 0.1 }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--accent)]/10">
                <FiCheck size={20} className="text-[var(--accent)]" strokeWidth={2} />
              </div>
              <h3 className="mt-5 font-display text-[22px] font-semibold leading-[1.2] text-[var(--text-primary)]">
                {w.title}
              </h3>
              <p className="mt-3 font-sans text-[15px] leading-[1.6] text-[var(--text-secondary)]">
                {w.body}
              </p>
            </motion.li>
          ))}
        </ul>
      </section>

      {/* Closing CTA */}
      <section className="bg-[#0F0E0C] text-[#F5F2EC]">
        <div className="mx-auto max-w-[1280px] px-6 py-24 text-center md:px-16 md:py-32">
          <motion.h2
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease }}
            className="mx-auto max-w-[20ch] font-display italic tracking-[-0.02em] leading-[1.05] text-[clamp(36px,5vw,64px)]"
          >
            Your storefront is one signup away.
          </motion.h2>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease, delay: 0.2 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <Link
              href="/dashboard/create"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#F97316] px-7 font-sans text-[15px] font-medium text-[#0F0E0C] transition-colors hover:bg-[#FFA052]"
            >
              Start selling
              <FiArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="font-sans text-[14px] text-[#BAB5A8] underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              Already selling? Sign in
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
