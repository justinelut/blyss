import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Paystack Inline JS (Mode A) checkout architecture gate.
 *
 * Mode A wires Paystack's Inline JS popup into Polar's existing
 * checkout form — buyer fills email + billing in Polar's
 * BaseCheckoutForm fields, clicks Polar's existing 'Pay now'
 * button, and the form's confirm callback opens the Paystack
 * popup. Single email field, single Pay button, popup handles the
 * actual charge. Webhook on charge.success creates the Order via
 * handle_success.
 *
 * Pre-payment surface (Polar's design):
 *   - Email + billing collected by BaseCheckoutForm
 *   - Pay-now button is BaseCheckoutForm's, not added by us
 *   - PaystackPaymentInterface owns no inputs and no Pay button —
 *     just renders a trust line in the children slot
 *
 * Payment surface (Paystack popup, opened by confirmPaystack):
 *   - Public key fetched via usePaystackPublicKey()
 *   - paystackPop() helper opens new PaystackPop().newTransaction(...)
 *   - subaccount + channels + checkout_id metadata threaded through
 *   - No /v1/checkouts/{secret}/charge POST — that path is the
 *     pre-Mode-A server-to-server pattern that triggered fraud
 *     flags. Legacy form preserved at .legacy.tsx for reference.
 */

const FILES = {
  ui: join(
    process.cwd(),
    'src/components/Checkout/components/PaystackPaymentInterface.tsx',
  ),
  form: join(
    process.cwd(),
    'src/components/Checkout/components/CheckoutForm.tsx',
  ),
  legacy: join(
    process.cwd(),
    'src/components/Checkout/components/PaystackPaymentInterface.legacy.tsx',
  ),
  hook: join(process.cwd(), 'src/hooks/queries/paystackConfig.ts'),
  helper: join(process.cwd(), 'src/utils/paystack-pop.ts'),
}

const read = (p: string) => readFileSync(p, 'utf8')

describe('Paystack Inline JS (Mode A) checkout', () => {
  test('CheckoutForm imports the inline-js helper + public-key hook', () => {
    const form = read(FILES.form)
    expect(form).toContain("from '@/hooks/queries/paystackConfig'")
    expect(form).toContain("from '@/utils/paystack-pop'")
    expect(form).toContain('usePaystackPublicKey')
    expect(form).toContain('paystackPop')
  })

  test('confirmPaystack opens Paystack popup with required config', () => {
    const form = read(FILES.form)
    expect(form).toContain('confirmPaystack')
    expect(form).toContain('paystackPop({')
    expect(form).toMatch(/publicKey,?/)
    expect(form).toMatch(/email,?/)
    expect(form).toMatch(/amount,?/)
    expect(form).toMatch(/currency,?/)
    expect(form).toMatch(/subaccount,?/)
    expect(form).toContain('onSuccess')
    expect(form).toContain('onCancel')
  })

  test('CheckoutForm threads checkout_id metadata for webhook reconciliation', () => {
    const form = read(FILES.form)
    expect(form).toMatch(/checkout_id:\s*updated\.id\s*\|\|\s*checkout\.id/)
  })

  test('CheckoutForm does NOT POST raw cards to legacy /v1/checkouts/.../charge', () => {
    const form = read(FILES.form)
    expect(form).not.toContain('/v1/checkouts/client/{client_secret}/charge')
    expect(form).not.toContain('useCheckoutCharge')
  })

  test('PaystackPaymentInterface owns no email field and no Pay button', () => {
    const ui = read(FILES.ui)
    // No email Input — Polar's BaseCheckoutForm already has one
    expect(ui).not.toMatch(/<Input[\s\S]*?type=['"]email['"]/)
    // No 'Pay …' or 'Tip …' button — Polar's BaseCheckoutForm's
    // 'Pay now' is the single CTA
    expect(ui).not.toMatch(/Pay\s+\$\{|Pay\s+KSh/)
  })

  test('PaystackPaymentInterface uses Blyss design tokens (no shadows)', () => {
    const ui = read(FILES.ui)
    expect(ui).toContain('var(--text-muted)')
    expect(ui).not.toMatch(/className="[^"]*shadow-md/)
    expect(ui).not.toMatch(/className="[^"]*shadow-lg/)
  })

  test('UI uses react-icons (not Lucide) per Blyss design rules', () => {
    const ui = read(FILES.ui)
    expect(ui).toContain("from 'react-icons/fi'")
    expect(ui).not.toMatch(/from ['"]lucide-react['"]/)
  })

  test('Legacy custom-channel form is preserved as fallback', () => {
    const legacy = read(FILES.legacy)
    expect(legacy.length).toBeGreaterThan(1000)
    expect(legacy).toContain('PaystackPaymentInterface')
  })

  test('public-config hook fetches the runtime key', () => {
    const hook = read(FILES.hook)
    expect(hook).toContain("'/v1/integrations/paystack/public-config'")
    expect(hook).toContain('usePaystackPublicKey')
  })

  test('paystackPop helper wraps PaystackPop().newTransaction', () => {
    const helper = read(FILES.helper)
    expect(helper).toContain("from '@paystack/inline-js'")
    expect(helper).toContain('new PaystackPop()')
    expect(helper).toContain('newTransaction')
    expect(helper).toContain('generatePaystackReference')
  })
})
