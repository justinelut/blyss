'use client'

/* Hallmark · component: paystack-checkout-interface · genre: editorial
 * theme: blyss-design (light cream + burnt orange #C2410C)
 *
 * Mode A (Paystack Inline JS modal). Buyer enters email in our
 * Blyss form, clicks "Pay {amount}", Paystack popup opens with the
 * channels we allow (card + M-Pesa for KE), buyer authorizes there,
 * popup closes, onSuccess fires. Backend webhook receives
 * charge.success → handle_success → Order created + benefits granted.
 *
 * Why we moved off the previous /charge server-to-server flow:
 *   - That path missed Paystack's device fingerprint, 3DS, and
 *     anti-fraud signals — which got us flagged for fraud.
 *   - PCI scope: raw card numbers were touching our backend. Now
 *     they only touch Paystack's iframe inside the popup, so our
 *     servers never see card data.
 *
 * The old custom card / M-Pesa / bank / USSD / QR / EFT forms live
 * on at PaystackPaymentInterface.legacy.tsx — kept for the rare
 * fallback case where Inline JS can't load (we can wire it back as a
 * one-off via a feature flag if needed).
 */

import { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { FiAlertCircle, FiArrowRight, FiLock } from 'react-icons/fi'
import type { schemas } from '@/lib/api'
import Input from '@/components/atoms/Input'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { cn } from '@/lib/utils'
import { toast } from '@/components/Toast/use-toast'
import { usePaystackPublicKey } from '@/hooks/queries/paystackConfig'
import {
  paystackPop,
  generatePaystackReference,
} from '@/utils/paystack-pop'

interface Props {
  checkout: schemas['CheckoutPublic']
  disabled?: boolean
  /** Notify parent of the selected channel id (here always 'paystack-pop'). */
  onPaymentMethodSelect?: (channel: string) => void
  /** Called when payment succeeds (Paystack popup confirmed). */
  onPaymentSuccess?: () => void
}

const fmtAmount = (cents: number, currency: string) => {
  const major = cents / 100
  const cur = currency.toUpperCase()
  if (cur === 'KES') return `KSh ${major.toLocaleString('en-KE')}`
  if (cur === 'USD') return `US$ ${major.toLocaleString('en-US')}`
  return `${cur} ${major.toLocaleString()}`
}

export const PaystackPaymentInterface = ({
  checkout,
  disabled,
  onPaymentMethodSelect,
  onPaymentSuccess,
}: Props) => {
  const form = useFormContext()
  const { data: publicConfig, isLoading: keyLoading } = usePaystackPublicKey()
  const [stage, setStage] = useState<
    'idle' | 'opening' | 'cancelled' | 'success'
  >('idle')
  const [email, setEmail] = useState<string>(
    (checkout as any).customer_email || '',
  )

  // Tell the parent form which channel we're on. We collapse all
  // Paystack channels into a single 'paystack-pop' identifier — the
  // popup picks the actual channel (card vs M-Pesa) via the buyer's
  // tab choice inside the modal.
  if (onPaymentMethodSelect) {
    onPaymentMethodSelect('paystack-pop')
  }

  const amount = checkout.total_amount ?? 0
  const currency = (checkout.currency ?? 'KES').toUpperCase()
  const subaccount = (checkout.organization as any)?.subaccount_code as
    | string
    | undefined
  const allowedChannels: Array<'card' | 'mobile_money'> =
    currency === 'KES' ? ['card', 'mobile_money'] : ['card']

  const onPay = () => {
    if (!publicConfig?.public_key) {
      toast({
        title: 'Payment unavailable',
        description: 'Paystack public key not configured. Try again shortly.',
        variant: 'error',
      })
      return
    }
    if (!email.trim()) {
      toast({
        title: 'Email required',
        description:
          'Enter your email so we can send your receipt and downloads.',
        variant: 'error',
      })
      return
    }
    if (!subaccount && checkout.payment_processor === 'paystack') {
      // Defense in depth: marketplace listings already gate inactive
      // creators, but if a buyer reaches this branch with no
      // subaccount we'd push the charge to Blyss's main account
      // instead of the creator's. Block it with a clear message
      // rather than silently mis-route the payment.
      toast({
        title: 'This item is unavailable right now',
        description:
          'The creator has not finished setting up payouts. Please try again later.',
        variant: 'error',
      })
      return
    }

    setStage('opening')
    const reference = generatePaystackReference(checkout.id)
    paystackPop({
      publicKey: publicConfig.public_key,
      email: email.trim(),
      amount,
      currency,
      reference,
      subaccount,
      channels: allowedChannels,
      metadata: {
        // Threaded into the charge.success webhook so the backend
        // can resolve Checkout → Order. checkout_id mirrors what
        // the previous /charge path put on the Paystack reference.
        checkout_id: checkout.id,
        ...((checkout as any).user_metadata?.cart_item_ids
          ? { cart_item_ids: (checkout as any).user_metadata.cart_item_ids }
          : {}),
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

  return (
    <div
      className="space-y-5"
      data-testid="paystack-payment-interface"
    >
      {/* Email — collected in our form so we own the pre-payment
          UX, then handed to Paystack as part of the popup config. */}
      <FormField
        control={form?.control}
        name="customer_email"
        defaultValue={email}
        render={() => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={disabled || stage === 'opening'}
                required
              />
            </FormControl>
            <p className="font-sans text-[12px] text-[var(--text-muted)]">
              For your receipt and download link.
            </p>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Pay button — opens Paystack popup. The popup itself shows
          Card / M-Pesa tabs (we allow ['card','mobile_money'] for
          KES). Buyer authorizes there. */}
      <button
        type="button"
        onClick={onPay}
        disabled={
          disabled ||
          keyLoading ||
          stage === 'opening' ||
          stage === 'success' ||
          !email.trim()
        }
        className={cn(
          'inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-7',
          'font-sans text-[15px] font-medium text-[var(--accent-foreground)]',
          'transition-colors hover:bg-[var(--accent-hover)]',
          'disabled:cursor-not-allowed disabled:opacity-60',
        )}
      >
        {stage === 'opening' ? (
          <>Opening secure payment…</>
        ) : stage === 'success' ? (
          <>Payment received</>
        ) : (
          <>
            Pay {fmtAmount(amount, currency)}
            <FiArrowRight size={14} aria-hidden="true" />
          </>
        )}
      </button>

      {/* Trust badge — quiet line, not a Stripe-style overstated
          marketing strip. Mentions the channels we accept + the
          PCI/encryption story. */}
      <p className="flex items-center gap-2 font-sans text-[12px] text-[var(--text-muted)]">
        <FiLock size={12} aria-hidden="true" />
        Secured by Paystack. Your card details never touch Blyss
        servers — they go straight to Paystack&rsquo;s PCI-DSS-compliant
        infrastructure.
      </p>

      {stage === 'cancelled' && (
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
              No charge was made. Click Pay above to try again.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// Default export retained for legacy import sites
// (CheckoutForm + components/index.ts).
export default PaystackPaymentInterface
