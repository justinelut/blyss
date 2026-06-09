import PaystackPop from '@paystack/inline-js'

/**
 * Thin wrapper around `new PaystackPop().newTransaction({...})`.
 *
 * Why we use Paystack's inline popup (Mode A):
 *
 *   - Paystack's modal collects device fingerprints, runs anti-fraud
 *     checks, and handles 3DS challenges — signals our own /charge
 *     server-to-server flow can't capture, which is what was getting
 *     us flagged for fraud.
 *   - Public key only. The secret key never leaves our server. We
 *     verify webhook signatures with the secret key on the backend
 *     (charge.success → handle_success → Order created).
 *   - Buyer experience: our Blyss-designed pre-payment form
 *     collects email + (optional) phone + cart context. Click
 *     "Pay" → Paystack popup opens → handles card / M-Pesa STK /
 *     bank / USSD / Apple Pay (whatever channels you allow) →
 *     buyer authorizes → popup closes → onSuccess fires with the
 *     transaction reference → backend's webhook + handle_success
 *     pipeline creates the Order.
 *
 * Single source of truth — every checkout entry point (main
 * checkout, embedded checkout, cart, donations, tipping, M-Pesa
 * verification) calls this helper instead of POST /v1/checkout/.../charge.
 */

export interface PaystackPopOptions {
  /** Public key (pk_live_... or pk_test_...) — fetch via usePaystackPublicKey(). */
  publicKey: string
  /** Buyer email — required by Paystack for the receipt + risk model. */
  email: string
  /** Amount in lowest currency unit (kobo for KES). */
  amount: number
  /** ISO 4217 currency. Always uppercase ('KES', not 'kes'). */
  currency: string
  /** Idempotency key. Use blyss_{checkoutId-prefix}_{token} format. */
  reference: string
  /** Creator's Paystack subaccount code. Money lands there; Blyss platform fee
   *  splits per the subaccount's percentage_charge. Omit for non-marketplace
   *  flows (e.g. M-Pesa verification charge to platform account). */
  subaccount?: string
  /** Channels to allow. KE marketplace defaults: ['card', 'mobile_money']. */
  channels?: Array<
    'card' | 'bank' | 'ussd' | 'qr' | 'mobile_money' | 'bank_transfer' | 'eft'
  >
  /** Echoed back by Paystack into the charge.success webhook payload —
   *  use to thread checkout_id, cart_item_ids, buyer_user_id, etc. through
   *  to the backend Order creation pipeline. */
  metadata?: Record<string, unknown>
  /** Called when the buyer authorizes payment and Paystack confirms.
   *  `transaction.reference` matches what we passed in. */
  onSuccess?: (transaction: { reference: string; status?: string }) => void
  /** Called if the buyer closes the popup before completing payment.
   *  No charge happens. Surface a "Try again" affordance in our UI. */
  onCancel?: () => void
  /** First and last name for the receipt + risk profile. Optional. */
  firstname?: string
  lastname?: string
}

/**
 * Open the Paystack popup with the given config.
 *
 * Returns the PaystackPop instance so callers can `.close()` programmatically
 * (e.g. on route unmount). Most callers can ignore the return value.
 */
export const paystackPop = (options: PaystackPopOptions): PaystackPop => {
  const pop = new PaystackPop()
  pop.newTransaction({
    key: options.publicKey,
    email: options.email,
    amount: options.amount,
    currency: options.currency,
    reference: options.reference,
    ...(options.subaccount ? { subaccount: options.subaccount } : {}),
    ...(options.channels ? { channels: options.channels } : {}),
    ...(options.metadata ? { metadata: options.metadata } : {}),
    ...(options.firstname ? { firstName: options.firstname } : {}),
    ...(options.lastname ? { lastName: options.lastname } : {}),
    onSuccess: (tx: { reference: string; status?: string }) => {
      options.onSuccess?.(tx)
    },
    onCancel: () => {
      options.onCancel?.()
    },
  } as any)
  return pop
}

/**
 * Generate a Blyss-branded transaction reference. Same shape as the
 * server-side reference helper in checkout/endpoints.py:
 *
 *   blyss_{first 8 hex chars of the resource id}_{8 random urlsafe chars}
 *
 * The first segment makes references grep-able against the row in the
 * database (Checkout, Donation, etc.); the random suffix guarantees
 * idempotency in case the buyer retries.
 */
export const generatePaystackReference = (resourceId: string, prefix = 'blyss'): string => {
  const idChunk = resourceId.replace(/-/g, '').slice(0, 8)
  const random = Math.random().toString(36).slice(2, 10)
  return `${prefix}_${idChunk}_${random}`
}
