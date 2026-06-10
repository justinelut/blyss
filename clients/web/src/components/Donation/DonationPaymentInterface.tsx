'use client'

/* Hallmark · component: donation-payment-interface · genre: editorial
 * theme: blyss-design (light cream + burnt orange #C2410C)
 *
 * Mode A (Paystack Inline JS popup) for tipping/donation.
 *
 * Flow:
 *   1. Donor enters name + optional message + email + amount in
 *      our Blyss form (we own the pre-payment surface)
 *   2. Click "Tip {creator}" → opens Paystack popup with config
 *      from /v1/donation/{slug}/popup-config
 *   3. Popup handles card / M-Pesa / 3DS / fraud — pays out to
 *      the creator's subaccount (90% creator / 10% Blyss split)
 *   4. onSuccess: charge.success webhook receives metadata
 *      {purpose: 'donation', donation_for_organization_id, donor_*}
 *      and inserts a Donation row idempotently.
 *
 * Old custom card / momo / bank / USSD / QR / EFT forms preserved
 * at DonationPaymentInterface.legacy.tsx.
 */

import { useState } from 'react'
import { FiArrowRight, FiHeart, FiLock } from 'react-icons/fi'
import { toast } from '@/components/Toast/use-toast'
import { cn } from '@/lib/utils'
import {
  paystackPop,
  generatePaystackReference,
} from '@/utils/paystack-pop'
import { api } from '@/utils/client'
import { useQuery } from '@tanstack/react-query'

interface Props {
  slug: string
  /** Tip amount in kobo (KES * 100). Donor adjusts via the parent
   *  page's amount picker; we display + relay to Paystack. */
  amount: number
  donorEmail: string
  donorName?: string
  message?: string
  canPay: boolean
  /** Fires after Paystack popup confirms — donor sees the success
   *  state, parent navigates back to creator. */
  onPaymentSuccess?: () => void
}

interface DonationPopupConfig {
  public_key: string
  organization_id: string
  organization_name: string
  subaccount_code: string | null
  currency: string
  suggested_amounts_kobo: number[]
  minimum_kobo: number
}

const fmtPrice = (cents: number, currency = 'KES') => {
  const major = cents / 100
  if (currency === 'KES') return `KSh ${major.toLocaleString('en-KE')}`
  return `${currency} ${major.toLocaleString()}`
}

/**
 * Fetch the donation popup config: Paystack public key, creator's
 * subaccount, suggested amounts. Cached for the donation session.
 */
const useDonationPopupConfig = (slug: string) =>
  useQuery({
    queryKey: ['donation', 'popup-config', slug],
    queryFn: async () => {
      const res = await (api as any).GET(
        '/v1/donation/{slug}/popup-config',
        { params: { path: { slug } } },
      )
      if (res.error) throw res.error
      return res.data as DonationPopupConfig
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!slug,
  })

export const DonationPaymentInterface = ({
  slug,
  amount,
  donorEmail,
  donorName,
  message,
  canPay,
  onPaymentSuccess,
}: Props) => {
  const { data: config, isLoading, error } = useDonationPopupConfig(slug)
  const [stage, setStage] = useState<
    'idle' | 'opening' | 'cancelled' | 'success'
  >('idle')
  // Email is owned by the parent form (donor_email). We read it from the
  // donorEmail prop rather than keeping a duplicate local field.
  const email = donorEmail || ''

  const onTip = () => {
    if (!config) {
      toast({
        title: 'Loading',
        description: 'Tip details still loading. Try again in a moment.',
        variant: 'error',
      })
      return
    }
    if (!config.public_key) {
      toast({
        title: 'Tipping unavailable',
        description: 'Paystack key not configured. Try again shortly.',
        variant: 'error',
      })
      return
    }
    if (!config.subaccount_code) {
      toast({
        title: 'Creator not ready for tips',
        description:
          'This creator hasn\u2019t finished setting up payouts yet. ' +
          'Tipping will be available once they verify their M-Pesa.',
        variant: 'error',
      })
      return
    }
    if (!email.trim()) {
      toast({
        title: 'Email required',
        description: 'We need your email to send a tip receipt.',
        variant: 'error',
      })
      return
    }
    if (amount < config.minimum_kobo) {
      toast({
        title: 'Tip too small',
        description: `Minimum tip is ${fmtPrice(config.minimum_kobo, config.currency)}.`,
        variant: 'error',
      })
      return
    }

    setStage('opening')
    const reference = generatePaystackReference(
      config.organization_id,
      'blyss_tip',
    )

    paystackPop({
      publicKey: config.public_key,
      email: email.trim(),
      amount,
      currency: config.currency,
      reference,
      subaccount: config.subaccount_code,
      channels: ['card', 'mobile_money'],
      metadata: {
        // Routing key picked up by paystack/tasks.py charge_success
        // → _handle_donation_success
        purpose: 'donation',
        donation_for_organization_id: config.organization_id,
        donor_email: email.trim(),
        ...(donorName ? { donor_name: donorName } : {}),
        ...(message ? { donor_message: message } : {}),
      },
      onSuccess: () => {
        setStage('success')
        onPaymentSuccess?.()
      },
      onCancel: () => {
        setStage('cancelled')
      },
    })
  }

  const buttonDisabled =
    !canPay ||
    isLoading ||
    !config ||
    !config.public_key ||
    !config.subaccount_code ||
    stage === 'opening' ||
    stage === 'success' ||
    !email.trim()

  return (
    <div className="space-y-5">
      {/* Tip button — opens Paystack popup. Email is collected once in the
          parent form (donor_email) and relayed here via the donorEmail prop;
          we intentionally do NOT render a second email field. */}
      {/* Tip button — opens Paystack popup */}
      <button
        type="button"
        onClick={onTip}
        disabled={buttonDisabled}
        className={cn(
          'inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-7',
          'font-sans text-[15px] font-medium text-[var(--accent-foreground)]',
          'transition-colors hover:bg-[var(--accent-hover)]',
          'disabled:cursor-not-allowed disabled:opacity-60',
        )}
      >
        {stage === 'opening' ? (
          <>Opening secure payment\u2026</>
        ) : stage === 'success' ? (
          <>
            <FiHeart size={14} aria-hidden="true" />
            Tip sent
          </>
        ) : !config?.subaccount_code && config ? (
          <>Creator not ready for tips</>
        ) : (
          <>
            Tip {fmtPrice(amount, config?.currency || 'KES')}
            <FiArrowRight size={14} aria-hidden="true" />
          </>
        )}
      </button>

      {/* Trust line */}
      <p className="flex items-center gap-2 font-sans text-[12px] text-[var(--text-muted)]">
        <FiLock size={12} aria-hidden="true" />
        Secured by Paystack. Your card details never touch Blyss
        servers.
      </p>

      {error && (
        <p className="font-sans text-[12px] text-[var(--danger)]">
          Couldn\u2019t load tip details. Please refresh the page.
        </p>
      )}

      {stage === 'cancelled' && (
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="font-sans text-[14px] font-medium text-[var(--text-primary)]">
            Tip was cancelled.
          </p>
          <p className="mt-1 font-sans text-[13px] text-[var(--text-secondary)]">
            No charge was made. Click Tip above to try again.
          </p>
        </div>
      )}
    </div>
  )
}

// Default export retained for legacy imports
export default DonationPaymentInterface
