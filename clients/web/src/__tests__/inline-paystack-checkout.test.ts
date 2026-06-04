import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Inline-Paystack architecture gate.
 *
 * Buyers must NEVER be redirected to Paystack's hosted checkout page.
 * Channels must be driven by the backend's per-currency registry, not
 * hard-coded in the frontend. This gate locks both invariants so a
 * future tidy-up can't silently re-introduce them.
 */

const FILES = {
  hooks: join(
    process.cwd(),
    'src/hooks/queries/checkoutPaystack.ts',
  ),
  ui: join(
    process.cwd(),
    'src/components/Checkout/components/PaystackPaymentInterface.tsx',
  ),
  form: join(
    process.cwd(),
    'src/components/Checkout/components/CheckoutForm.tsx',
  ),
}

describe('Inline Paystack-native checkout', () => {
  const hooks = readFileSync(FILES.hooks, 'utf8')
  const ui = readFileSync(FILES.ui, 'utf8')
  const form = readFileSync(FILES.form, 'utf8')

  test('no redirect to Paystack authorization_url', () => {
    expect(form).not.toMatch(
      /window\.location\.href\s*=\s*[^\n]*authorization_url/,
    )
    expect(ui).not.toMatch(/authorization_url/)
  })

  test('hooks call the backend inline-charge endpoints', () => {
    expect(hooks).toContain(
      '/v1/checkouts/client/{client_secret}/payment-channels',
    )
    expect(hooks).toContain('/v1/checkouts/client/{client_secret}/charge')
    expect(hooks).toContain(
      '/v1/checkouts/client/{client_secret}/charge/submit/{action}',
    )
    expect(hooks).toContain(
      '/v1/checkouts/client/{client_secret}/payment-status',
    )
  })

  test('payment status hook polls every 3 seconds while pending', () => {
    expect(hooks).toContain('refetchInterval')
    expect(hooks).toMatch(/3000/)
  })

  test('UI consumes channels dynamically (no hard-coded list)', () => {
    expect(ui).toContain('useCheckoutPaymentChannels')
    expect(ui).toContain('channels.map')
    expect(ui).not.toMatch(/const paymentMethods\s*=\s*\[/)
  })

  test('UI handles next-action steps inline (otp / pin / phone / birthday)', () => {
    expect(ui).toContain("'otp' | 'pin' | 'phone' | 'birthday'")
    expect(ui).toContain('useCheckoutChargeSubmitStep')
    // No external popup / paystack JS bundle import
    expect(ui).not.toMatch(/PaystackPop|paystack\.js|paystackjs/)
  })

  test('CheckoutForm switches Paystack vs Stripe by payment_processor', () => {
    expect(form).toMatch(/payment_processor === 'paystack'/)
  })
})
