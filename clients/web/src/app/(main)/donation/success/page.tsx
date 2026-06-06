/* Hallmark · component: donation/success · genre: editorial
 * theme: blyss-design (light cream + burnt orange #C2410C accent)
 * sections: Eyebrow · Headline · Tipping summary · Reference · Actions
 * contrast: pass · slop: pass (gates 1, 2, 7, 8)
 *
 * Lands here from Paystack post-charge redirect carrying ?reference=...&
 * amount=...&organization=.... Same palette + voice as the rest of the
 * marketplace; replaces the Polar-era gray-on-gray page.
 */

import Link from 'next/link'
import { FiCheckCircle, FiArrowRight } from 'react-icons/fi'
import { Eyebrow, typography } from '@/design'
import { cn } from '@/lib/utils'

export default function DonationSuccessPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const reference = searchParams.reference as string | undefined
  const amount = searchParams.amount as string | undefined
  const organizationSlug = searchParams.organization as string | undefined

  // amount is sent as minor units (cents). Format as KSh major units.
  const amountKes = amount ? (parseInt(amount, 10) || 0) / 100 : null
  const amountLabel =
    amountKes !== null && amountKes > 0
      ? `KSh ${amountKes.toLocaleString('en-KE')}`
      : null

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-[720px] flex-col items-start gap-8 px-6 py-20 md:px-16 md:py-32">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)]">
        <FiCheckCircle size={24} aria-hidden="true" />
      </span>

      <div>
        <Eyebrow accent>Thank you</Eyebrow>
        <h1
          className={cn(
            'mt-4 max-w-[24ch] font-display text-[clamp(32px,4.5vw,56px)] font-semibold tracking-[-0.02em] leading-[1.04] text-[var(--text-primary)]',
          )}
          style={{ overflowWrap: 'anywhere', minWidth: 0 }}
        >
          Your tip is on its way
          {organizationSlug ? ' to the creator.' : '.'}
        </h1>
        <p
          className={cn(
            typography.body,
            'mt-5 max-w-[56ch] text-[var(--text-secondary)]',
          )}
        >
          A receipt is on its way to your email. The creator receives the full
          amount minus payment processor fees on the next payout cycle.
        </p>
      </div>

      {/* Tabular receipt summary */}
      {(amountLabel || reference) && (
        <dl className="flex w-full max-w-[480px] flex-col gap-3 border-y border-[var(--border)] py-6">
          {amountLabel && (
            <div className="flex items-baseline justify-between gap-4">
              <dt className="font-sans text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Amount
              </dt>
              <dd className="font-display text-[24px] font-semibold tabular-nums text-[var(--text-primary)]">
                {amountLabel}
              </dd>
            </div>
          )}
          {reference && (
            <div className="flex items-baseline justify-between gap-4">
              <dt className="font-sans text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Reference
              </dt>
              <dd className="break-all font-mono text-[12px] text-[var(--text-secondary)]">
                {reference}
              </dd>
            </div>
          )}
        </dl>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        <Link
          href={organizationSlug ? `/creators/${organizationSlug}` : '/'}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-6 font-sans text-[14px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
        >
          {organizationSlug ? 'Back to the creator' : 'Back to the marketplace'}
          <FiArrowRight size={14} aria-hidden="true" />
        </Link>
        <Link
          href="/marketplace"
          className="font-sans text-[14px] text-[var(--text-secondary)] underline-offset-4 transition-colors hover:text-[var(--accent)] hover:underline"
        >
          Or, browse the marketplace
        </Link>
      </div>
    </main>
  )
}
