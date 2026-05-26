'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, Sparkles, Wallet, Share2, Headphones } from 'lucide-react'
import type { schemas } from '@/lib/api'
import { BlyssLogo, Eyebrow, typography } from '@/design'
import { cn } from '@/lib/utils'

type Organization = schemas['Organization']

interface Props {
  organization: Organization
  welcomeStatus?: string
  welcomeStatusDescription?: string
}

const checklist = [
  {
    icon: Sparkles,
    title: 'List your first product',
    body: 'Pick what you want to sell — a beat pack, a Notion template, an ebook, a community subscription. Add a name, price, and the file or content. Takes about 2 minutes.',
    cta: 'Create a product',
  },
  {
    icon: Wallet,
    title: 'Connect Paystack for payouts',
    body: 'Link your Paystack account so we can deposit your earnings to your bank or M-Pesa. You only need to do this before your first sale.',
    cta: 'Set up payouts',
    href: '/dashboard/{slug}/finance/account',
  },
  {
    icon: Share2,
    title: 'Share your storefront',
    body: 'Your store is live at blyss.co.ke/{slug}. Drop the link in your bio, post about it, tell your community. Sales start the moment people land on it.',
  },
] as const

const supportItems = [
  {
    icon: Headphones,
    title: 'Stuck on something?',
    body: 'Email support@blyss.co.ke and we usually reply within a few hours during Nairobi business days.',
  },
] as const

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
            className="mb-10 inline-flex flex-col gap-1 rounded-md border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-3 text-[14px]"
            role="status"
          >
            <span className="font-medium text-[var(--accent)]">
              ✓ {welcomeStatus}
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

        {/* Step list */}
        <div className="mt-14 flex flex-col gap-4">
          {checklist.map((step, i) => {
            const Icon = step.icon
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
                className={cn(
                  'group relative flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 md:flex-row md:items-start md:p-8',
                  isPrimary &&
                    'border-[var(--accent)]/40 bg-[var(--surface-elevated)] shadow-[0_2px_24px_-12px_var(--accent)]',
                )}
              >
                <div
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg',
                    isPrimary
                      ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                      : 'bg-[var(--surface-sunken)] text-[var(--text-secondary)]',
                  )}
                >
                  <Icon size={20} strokeWidth={1.75} />
                </div>

                <div className="flex-1">
                  <h2
                    className={cn(
                      'font-display font-semibold tracking-[-0.02em] text-[22px] text-[var(--text-primary)]',
                    )}
                  >
                    <span className="text-[var(--text-muted)] mr-2 font-mono text-sm">
                      {String(i + 1).padStart(2, '0')}
                    </span>
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
                      <ArrowRight
                        size={14}
                        strokeWidth={2}
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
            <ArrowRight size={14} strokeWidth={2} />
          </Link>
        </motion.div>

        {/* Support */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease, delay: 0.6 }}
          className="mt-16"
        >
          {supportItems.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.title}
                className="flex items-start gap-3 text-[14px] text-[var(--text-muted)]"
              >
                <Icon size={16} strokeWidth={1.75} className="mt-0.5" />
                <p>
                  <span className="font-medium text-[var(--text-secondary)]">
                    {item.title}
                  </span>{' '}
                  {item.body}
                </p>
              </div>
            )
          })}
        </motion.div>
      </div>
    </div>
  )
}
