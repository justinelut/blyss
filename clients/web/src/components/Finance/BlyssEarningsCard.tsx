/* Hallmark · component: finance/blyss-earnings · genre: editorial-utility
 * theme: blyss-design (light cream + burnt orange #C2410C accent)
 *
 * BlyssEarningsCard — shown to creators with an active Paystack
 * subaccount on /finance/income and /finance/payouts.
 *
 * Why this exists: Paystack settles 80% of every sale directly into the
 * creator's M-Pesa wallet (or KE bank account) on a T+2 schedule. There's
 * no balance to "withdraw" — the funds flow through automatically. The
 * legacy Polar/Stripe AccountBalance + WithdrawModal pair only shows when
 * a Polar Account row exists, which Blyss creators never have, so without
 * this card they see an empty income page after activating payouts.
 *
 * The card explains the model in plain language and points at the
 * Paystack dashboard for the transaction history (until we wire a Blyss-
 * native one).
 */
'use client'

import { schemas } from '@/lib/api'
import { FiArrowUpRight, FiCheck } from 'react-icons/fi'

interface BlyssEarningsCardProps {
  organization: schemas['Organization']
}

export const BlyssEarningsCard: React.FC<BlyssEarningsCardProps> = ({
  organization,
}) => {
  const payoutMethod = (organization as { payout_method?: string })
    .payout_method
  const mpesaNumber = (organization as { mpesa_number?: string }).mpesa_number
  const bankAccountNumber = (
    organization as { bank_account_number?: string }
  ).bank_account_number

  const destination =
    payoutMethod === 'mpesa' && mpesaNumber
      ? `M-Pesa ${mpesaNumber}`
      : payoutMethod === 'bank' && bankAccountNumber
        ? `bank account ending ${String(bankAccountNumber).slice(-4)}`
        : 'your payout account'

  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8">
      <div className="flex items-start gap-4">
        <div className="mt-1 flex h-10 w-10 flex-none items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)]">
          <FiCheck
            size={18}
            className="text-[var(--accent)]"
            aria-hidden="true"
          />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
              Earnings
            </p>
            <h2 className="mt-2 font-display text-[22px] font-semibold leading-[1.15] tracking-[-0.02em] text-[var(--text-primary)]">
              Settle automatically to {destination}.
            </h2>
          </div>
          <p className="max-w-[60ch] font-sans text-[15px] leading-[1.55] text-[var(--text-secondary)]">
            Paystack splits each sale at the moment of payment — you receive
            80% directly into your{' '}
            {payoutMethod === 'mpesa' ? 'M-Pesa wallet' : 'bank account'},
            and Blyss keeps 20% as the marketplace fee. Settlement is T+2
            (working days), so a Monday sale lands by Wednesday end-of-day.
            No manual withdrawal needed.
          </p>
          <a
            href="https://dashboard.paystack.com/#/transactions"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-sans text-[14px] font-medium text-[var(--accent)] underline-offset-4 hover:underline"
          >
            Transaction history on Paystack
            <FiArrowUpRight size={14} aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  )
}
