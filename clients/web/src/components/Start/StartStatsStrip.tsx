'use client'

/* Hallmark · component: start/stats-strip · genre: editorial
 * Real-numbers band shown on /start to motivate creators considering
 * signup. Same data source as the homepage hero (/v1/marketplace/stats),
 * different presentation: full-width band of four cells with eyebrow
 * type, hairline rules, no decoration.
 *
 * Hides itself when totals are zero (fresh deploy, no creators yet) so
 * we never advertise "0 creators" to a visitor who's about to sign up.
 */

import { motion, useReducedMotion } from 'motion/react'
import { Eyebrow } from '@/design'

export interface StartStats {
  creators: number
  products: number
  total_paid_out: number
  total_earned: number
  total_paid_out_currency: string
  settlements_count: number
}

interface Props {
  stats: StartStats | null
}

export const StartStatsStrip = ({ stats }: Props) => {
  const reduce = useReducedMotion()
  if (!stats) return null
  const showCreators = stats.creators > 0
  const showProducts = stats.products > 0
  // Prefer the confirmed-settlement number when we have it; fall
  // back to total_earned (orders × creator share) when no
  // transfer.success webhook has fired yet — the money has already
  // moved to creators' Paystack subaccounts at charge time, just
  // not yet settled to bank/M-Pesa. Showing earned-but-not-settled
  // gives an honest live number on fresh deploys instead of "0".
  const moneyValue = stats.total_paid_out > 0
    ? stats.total_paid_out
    : stats.total_earned
  const moneyLabel = stats.total_paid_out > 0 ? 'Paid to creators' : 'Earned by creators'
  const moneyDetail =
    stats.total_paid_out > 0
      ? `Across ${stats.settlements_count} settlement${
          stats.settlements_count === 1 ? '' : 's'
        }`
      : 'Settlements roll out on Paystack T+2'
  const showMoney = moneyValue > 0

  // If the deploy is fresh and we'd show zero across the board, skip
  // the whole strip rather than print "0 / 0 / 0".
  if (!showCreators && !showProducts && !showMoney) return null

  return (
    <section
      aria-label="Marketplace at a glance"
      className="border-y border-[var(--border)] bg-[var(--background)]"
    >
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-15%' }}
        transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
        className="mx-auto max-w-[1280px] px-6 py-12 md:px-16 md:py-16"
      >
        <Eyebrow accent>Where Blyss is right now</Eyebrow>
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4">
          {showCreators && (
            <Stat
              value={formatCount(stats.creators)}
              label="Independent creators"
              detail="Selling on Blyss today"
            />
          )}
          {showProducts && (
            <Stat
              value={formatCount(stats.products)}
              label="Live products"
              detail="Templates, ebooks, beats, presets, courses"
            />
          )}
          {showMoney && (
            <Stat
              value={formatMoney(
                moneyValue,
                stats.total_paid_out_currency,
              )}
              label={moneyLabel}
              detail={moneyDetail}
            />
          )}
          <Stat value="24h" label="Payout window" detail="M-Pesa or bank" />
        </div>
      </motion.div>
    </section>
  )
}

const Stat: React.FC<{ value: string; label: string; detail: string }> = ({
  value,
  label,
  detail,
}) => (
  <div className="flex flex-col gap-1">
    <span className="font-display text-[40px] font-semibold leading-[1.0] tracking-[-0.02em] tabular-nums text-[var(--text-primary)] md:text-[48px]">
      {value}
    </span>
    <span className="mt-2 font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
      {label}
    </span>
    <span className="font-sans text-[12px] leading-[1.5] text-[var(--text-secondary)]">
      {detail}
    </span>
  </div>
)

const formatCount = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

const formatMoney = (minor: number, currency: string): string => {
  const major = (minor || 0) / 100
  const cur = (currency || 'kes').toUpperCase()
  const symbol = cur === 'KES' ? 'KSh' : cur === 'USD' ? 'US$' : cur
  return `${symbol} ${formatCount(Math.round(major))}`
}
