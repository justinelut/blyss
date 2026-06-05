import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Inline-Paystack architecture gate.
 *
 *   - Buyer never redirected to Paystack's hosted checkout.
 *   - Channels driven by the backend's per-currency registry.
 *   - Channel selector is a Stripe-style horizontal-scroll tab strip.
 *   - Inputs use Polar's existing FormField + atoms/Input components,
 *     not raw <input> with custom chrome.
 *   - The component owns NO submit button — the existing Polar Pay
 *     button in BaseCheckoutForm submits.
 *   - No Lucide icon library on this surface; payment-method icons are
 *     custom SVGs from `components/Brand/payment-icons`.
 */

const FILES = {
  hooks: join(process.cwd(), 'src/hooks/queries/checkoutPaystack.ts'),
  ui: join(
    process.cwd(),
    'src/components/Checkout/components/PaystackPaymentInterface.tsx',
  ),
  form: join(
    process.cwd(),
    'src/components/Checkout/components/CheckoutForm.tsx',
  ),
  icons: join(process.cwd(), 'src/components/Brand/payment-icons.tsx'),
}

describe('Inline Paystack-native checkout', () => {
  const hooks = readFileSync(FILES.hooks, 'utf8')
  const ui = readFileSync(FILES.ui, 'utf8')
  const form = readFileSync(FILES.form, 'utf8')
  const icons = readFileSync(FILES.icons, 'utf8')

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

  test('UI uses Polar inputs and FormLabel — not raw <input>', () => {
    expect(ui).toContain("import Input from '@/components/atoms/Input'")
    expect(ui).toContain('FormLabel')
    expect(ui).toContain("from '@/components/ui/form'")
  })

  test('UI has NO Lucide imports', () => {
    expect(ui).not.toMatch(/from\s+['"]lucide-react['"]/)
  })

  test('UI mounts payment-method icons from custom SVG set', () => {
    expect(ui).toContain("from '@/components/Brand/payment-icons'")
  })

  test('Channel selector is a horizontal-scroll tabs strip', () => {
    expect(ui).toContain('overflow-x-auto')
    expect(ui).toContain('scroll-snap-type:x_mandatory')
    expect(ui).toContain('role="tablist"')
    expect(ui).toContain('role="tab"')
  })

  test('UI consumes channels dynamically (no hard-coded list)', () => {
    expect(ui).toContain('useCheckoutPaymentChannels')
    expect(ui).toContain('channels.map')
    expect(ui).not.toMatch(/const paymentMethods\s*=\s*\[/)
  })

  test('UI handles next-action steps inline', () => {
    expect(ui).toContain("'otp' | 'pin' | 'phone' | 'birthday'")
    expect(ui).toContain('useCheckoutChargeSubmitStep')
    expect(ui).not.toMatch(/PaystackPop|paystack\.js|paystackjs/)
  })

  test('UI does not render its own Pay/Submit primary button', () => {
    // The only buttons in the file are channel tabs, provider selectors,
    // and the inline next-action submit (OTP/PIN). The component must
    // NOT add a primary "Pay" button — that's the parent form's job.
    // Match only actual <button> tags whose visible text is "Pay" or
    // "Pay now"; the string "Pay now" appearing inside instructional
    // copy (e.g. "Click Pay now to generate…") is fine.
    expect(ui).not.toMatch(/<button[^>]*>\s*Pay now\s*</)
    expect(ui).not.toMatch(/<button[^>]*>\s*Pay\s*</)
  })

  test('CheckoutForm switches Paystack vs Stripe by payment_processor', () => {
    expect(form).toMatch(/payment_processor === 'paystack'/)
  })

  test('CheckoutForm mounts Paystack UI in the children slot', () => {
    // Match against the same multi-line block we wrote.
    expect(form).toContain('<PaystackPaymentInterface')
    expect(form).not.toMatch(/beforeSubmit=\{[\s\S]*?<PaystackPaymentInterface/)
  })

  test('Payment icons are path-based custom SVGs (no Lucide)', () => {
    expect(icons).not.toMatch(/from\s+['"]lucide-react['"]/)
    expect(icons).toMatch(/<svg/)
    expect(icons).toContain('VisaLogo')
    expect(icons).toContain('MastercardLogo')
    expect(icons).toContain('MpesaLogo')
    expect(icons).toContain('UssdGlyph')
    expect(icons).toContain('QrGlyph')
  })
})
