'use client'

/* Hallmark · component: paystack-checkout-interface · genre: editorial
 * theme: blyss-design (light cream + burnt orange #C2410C)
 *
 * Mode A (Paystack Inline JS popup), wired into Polar's existing
 * checkout form. We don't render our own email field, our own Pay
 * button, or our own trust copy — Polar's BaseCheckoutForm already
 * provides the email/billing fields, the 'Pay now' CTA, and the
 * "Secured by Paystack" mandate text in the footer.
 *
 * The popup-opening lives in PaystackCheckoutForm's confirmPaystack
 * callback (CheckoutForm.tsx) — fired when the buyer hits Polar's
 * Pay-now button.
 *
 * This component sits in the children slot to:
 *   - tell the parent which channel-id we're on (analytics)
 *   - render a quiet "Payment cancelled" hint when the popup was
 *     closed without authorization (so the buyer knows they can
 *     try again)
 */

import { useEffect } from 'react'
import { FiAlertCircle } from 'react-icons/fi'
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

  if (!cancelled) {
    // Empty children slot — the form renders Polar's existing
    // email + billing + Pay-now structure with the mandate footer
    // ('Secured by Paystack…') unchanged.
    return null
  }

  return (
    <div className="space-y-4" data-testid="paystack-payment-interface">
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
    </div>
  )
}

export default PaystackPaymentInterface
