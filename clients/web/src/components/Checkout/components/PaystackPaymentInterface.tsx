'use client'

/* Hallmark · component: paystack-checkout-interface · genre: editorial
 * theme: blyss-design (light cream + burnt orange #C2410C)
 *
 * Mode A (Paystack Inline JS popup), wired into Polar's existing
 * checkout form. We don't render our own email field or Pay button —
 * Polar's BaseCheckoutForm already collects email/billing/cardholder
 * and owns the "Pay now" button. Our component only sits in the
 * children slot to:
 *   - tell the parent which channel-id we're on (analytics)
 *   - render the trust line + cancelled-state hint
 *
 * The actual popup-opening lives in PaystackCheckoutForm's
 * confirmPaystack callback (CheckoutForm.tsx) — that fires when the
 * buyer hits Polar's Pay-now button.
 */

import { useEffect } from 'react'
import { FiAlertCircle, FiLock } from 'react-icons/fi'
import type { schemas } from '@/lib/api'

interface Props {
  checkout: schemas['CheckoutPublic']
  disabled?: boolean
  /** Notify parent of the selected channel id (always 'paystack-pop'
   *  for Mode A — popup picks card vs M-Pesa internally). */
  onPaymentMethodSelect?: (channel: string) => void
  /** Called when the popup confirms the payment. */
  onPaymentSuccess?: () => void
  /** Called when the buyer closes the popup before paying. */
  onPaymentCancelled?: () => void
  /** Optional flag mirrored from CheckoutForm — render a small
   *  "Payment cancelled" hint when the popup was closed without
   *  authorization. */
  cancelled?: boolean
}

export const PaystackPaymentInterface = ({
  onPaymentMethodSelect,
  cancelled,
}: Props) => {
  // Single channel identifier for Mode A. Mounted once.
  useEffect(() => {
    onPaymentMethodSelect?.('paystack-pop')
  }, [onPaymentMethodSelect])

  return (
    <div className="space-y-4" data-testid="paystack-payment-interface">
      {/* Trust line — quiet, not a marketing strip. Sits where the
          old per-channel selector used to render so the form's
          reading order stays: Email → trust line → Cardholder
          name → Billing address → Pay button. */}
      <p className="flex items-center gap-2 font-sans text-[12px] text-[var(--text-muted)]">
        <FiLock size={12} aria-hidden="true" />
        Click <span className="font-medium text-[var(--text-primary)]">Pay now</span>{' '}
        below to open Paystack&rsquo;s secure payment window. Your
        card details never touch Blyss servers.
      </p>

      {cancelled && (
        <div className="flex items-start gap-3 rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
          <FiAlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]"
            aria-hidden="true"
          />
          <div className="flex-1">
            <p className="font-sans text-[14px] font-medium text-[var(--text-primary)]">
              Payment was cancelled.
            </p>
            <p className="mt-1 font-sans text-[13px] text-[var(--text-secondary)]">
              No charge was made. Click <span className="font-medium">Pay now</span>{' '}
              to try again.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// Default export retained for legacy import sites.
export default PaystackPaymentInterface
