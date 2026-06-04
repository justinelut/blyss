import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Paystack-native buyer checkout gate.
 *
 * Buyer flow used to ALWAYS render `<StripeCheckoutForm>` regardless of the
 * actual checkout's `payment_processor`, even though Blyss runs on Paystack
 * end-to-end. The gate locks down the new processor-aware routing:
 *
 *   - `CheckoutForm` switches on `checkout.payment_processor` and renders
 *     `<PaystackCheckoutForm>` when it's `'paystack'`.
 *   - `PaystackCheckoutForm` mounts the channel selector (card / M-Pesa /
 *     bank) above the buyer's billing form via the `beforeSubmit` slot.
 *   - On confirm, the Paystack form redirects the buyer to the
 *     `authorization_url` returned in `payment_processor_metadata` rather
 *     than trying to mint a Stripe ConfirmationToken (which fails for
 *     non-Stripe checkouts).
 */

const FILE = join(
  process.cwd(),
  'src/components/Checkout/components/CheckoutForm.tsx',
)

describe('Paystack-native buyer checkout', () => {
  const src = readFileSync(FILE, 'utf8')

  test('CheckoutForm switches on payment_processor', () => {
    expect(src).toMatch(/payment_processor === 'paystack'/)
  })

  test('PaystackCheckoutForm component exists', () => {
    expect(src).toContain('const PaystackCheckoutForm =')
  })

  test('Paystack channel selector renders above billing fields', () => {
    expect(src).toContain('<PaystackPaymentInterface')
    expect(src).toContain('beforeSubmit=')
  })

  test('Paystack confirm redirects to authorization_url', () => {
    expect(src).toMatch(
      /window\.location\.href\s*=\s*meta\.authorization_url/,
    )
  })

  test('Paystack confirm does not require Stripe SDK objects', () => {
    expect(src).toContain('props.confirm(data, null, null)')
  })
})
