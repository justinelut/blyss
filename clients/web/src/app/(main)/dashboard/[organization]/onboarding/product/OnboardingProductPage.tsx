'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { FiArrowRight } from 'react-icons/fi'
import type { schemas } from '@/lib/api'
import { BlyssLogo, Eyebrow, typography } from '@/design'
import { cn } from '@/lib/utils'

type Organization = schemas['Organization']

interface Props {
  organization: Organization
  welcomeStatus?: string
  welcomeStatusDescription?: string
}

const checklist: ReadonlyArray<{
  title: string
  body: string
  cta?: string
  href?: string
}> = [
  {
    title: 'List your first product',
    body: 'Pick what you want to sell — a beat pack, a Notion template, an ebook, a community subscription. Add a name, price, and the file or content. Takes about 2 minutes.',
    cta: 'Create a product',
  },
  {
    title: 'Connect Paystack for payouts',
    body: 'Link your Paystack account so we can deposit your earnings to your bank or M-Pesa. You only need to do this before your first sale.',
    cta: 'Set up payouts',
    href: '/dashboard/{slug}/finance/account',
  },
  {
    title: 'Share your storefront',
    body: 'Your store is live at blyss.co.ke/creators/{slug}. Drop the link in your bio, post about it, tell your community. Sales start the moment people land on it.',
  },
]

export default function OnboardingProductPage({
  organization,
  welcomeStatus,
  welcomeStatusDescription,
}: Props) {
  const reduce = useReducedMotion()
  const ease = [0.32, 0.72, 0, 1] as const

  const productNewHref = `/dashboard/${organization.slug}/products/new`
  const dashboardHref = `/dashboard/${organization.slug}`

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-[960px] px-6 py-16 md:px-12 md:py-24">
        {/* Brand */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="mb-12"
        >
          <BlyssLogo size="lg" />
        </motion.div>

        {/* Toast banner — pulled from query string */}
        {welcomeStatus && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease, delay: 0.05 }}
            className="mb-10 inline-flex flex-col gap-1 border-l-2 border-[var(--accent)] bg-[var(--surface)] px-4 py-3 text-[14px]"
            role="status"
          >
            <span className="font-medium text-[var(--accent)]">
              {welcomeStatus}
            </span>
            {welcomeStatusDescription && (
              <span className="text-[var(--text-secondary)]">
                {welcomeStatusDescription}
              </span>
            )}
          </motion.div>
        )}

        {/* Heading */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease, delay: 0.1 }}
        >
          <Eyebrow accent>Welcome, {organization.name}</Eyebrow>
          <h1
            className={cn(
              typography.h1,
              'mt-4 max-w-[18ch] text-[clamp(40px,5.5vw,68px)] text-[var(--text-primary)]',
            )}
          >
            Your store is live. Now let&rsquo;s sell something.
          </h1>
          <p className="mt-6 max-w-[58ch] font-sans text-[18px] leading-[1.55] text-[var(--text-secondary)]">
            Three short steps to your first sale. List a product first — that
            unlocks the rest of the checklist.
          </p>
        </motion.div>

        {/* Step list — editorial numbered rows, hairline dividers, no tiles */}
        <div className="mt-14 border-t border-[var(--border)]">
          {checklist.map((step, i) => {
            const isPrimary = i === 0
            const href = step.href?.replace('{slug}', organization.slug)
            return (
              <motion.div
                key={step.title}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  ease,
                  delay: 0.18 + i * 0.08,
                }}
                className="group flex gap-6 border-b border-[var(--border)] py-8 md:gap-10"
              >
                <span
                  className={cn(
                    'shrink-0 font-display text-[40px] font-semibold leading-none tracking-[-0.03em] [font-variant-numeric:tabular-nums] md:text-[56px]',
                    isPrimary
                      ? 'text-[var(--accent)]'
                      : 'text-[var(--border-strong)]',
                  )}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>

                <div className="flex-1 pt-1">
                  <h2 className="font-display text-[22px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                    {step.title}
                  </h2>
                  <p className="mt-2 max-w-[58ch] font-sans text-[15px] leading-[1.6] text-[var(--text-secondary)]">
                    {step.body}
                  </p>

                  {step.cta && (isPrimary || href) && (
                    <Link
                      href={isPrimary ? productNewHref : href ?? dashboardHref}
                      className={cn(
                        'mt-5 inline-flex items-center gap-1.5 font-sans text-[14px] font-medium underline-offset-4',
                        isPrimary
                          ? 'text-[var(--accent)] hover:underline'
                          : 'text-[var(--text-primary)] hover:underline',
                      )}
                    >
                      {step.cta}
                      <FiArrowRight
                        size={14}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    </Link>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Quiet "skip to dashboard" affordance */}
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease, delay: 0.5 }}
          className="mt-8 flex items-center justify-between gap-4 border-t border-[var(--border)] pt-8"
        >
          <Link
            href={dashboardHref}
            className="font-sans text-[14px] text-[var(--text-muted)] underline-offset-4 hover:text-[var(--text-primary)] hover:underline"
          >
            Skip — take me to the dashboard
          </Link>
          <Link
            href={productNewHref}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md bg-[var(--accent)] px-6 font-sans text-[14px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            Create my first product
            <FiArrowRight size={14} />
          </Link>
        </motion.div>

        {/* Support */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease, delay: 0.6 }}
          className="mt-16 text-[14px] text-[var(--text-muted)]"
        >
          <p>
            <span className="font-medium text-[var(--text-secondary)]">
              Stuck on something?
            </span>{' '}
            Email{' '}
            <a
              href="mailto:support@blyss.co.ke"
              className="text-[var(--text-secondary)] underline-offset-4 hover:text-[var(--accent)] hover:underline"
            >
              support@blyss.co.ke
            </a>{' '}
            and we usually reply within a few hours during Nairobi business
            days.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
