import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Paystack Inline JS (Mode A) checkout architecture gate.
 *
 * Pre-payment surface (our Blyss design):
 *   - Email collected in our form via FormField + atoms/Input
 *   - Pay button uses --accent token, Inter Display label
 *   - No raw <input> elements with custom chrome
 *
 * Payment surface (Paystack popup, opened on Pay):
 *   - Public key fetched via usePaystackPublicKey() — never bundled
 *   - paystackPop() helper opens new PaystackPop().newTransaction(...)
 *   - subaccount + channels + metadata threaded through to the
 *     charge.success webhook on the backend
 *   - No /v1/checkouts/{secret}/charge POST — that path was the
 *     pre-Mode-A server-to-server pattern that triggered Paystack
 *     fraud flags. Legacy form is preserved at .legacy.tsx but not
 *     mounted from the active interface.
 *
 * Backend integration:
 *   - GET /v1/integrations/paystack/public-config returns the public
 *     key from runtime_settings overlay → env fallback
 *   - charge.success webhook → checkout_service.handle_success →
 *     Order created + benefits granted (already in place from prior
 *     Phase 1 work, no test pinning here)
 */

const FILES = {
  ui: join(
    process.cwd(),
    'src/components/Checkout/components/PaystackPaymentInterface.tsx',
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
  test('UI imports the inline-js helper + public-key hook', () => {
    const ui = read(FILES.ui)
    expect(ui).toContain("from '@/hooks/queries/paystackConfig'")
    expect(ui).toContain("from '@/utils/paystack-pop'")
    expect(ui).toContain('usePaystackPublicKey')
    expect(ui).toContain('paystackPop')
  })

  test('Pay button opens Paystack popup with required config', () => {
    const ui = read(FILES.ui)
    expect(ui).toContain('paystackPop({')
    expect(ui).toMatch(/publicKey:\s*publicConfig\.public_key/)
    expect(ui).toMatch(/email:\s*email/)
    expect(ui).toMatch(/amount,/)
    expect(ui).toMatch(/currency,/)
    expect(ui).toMatch(/subaccount,/)
    expect(ui).toContain('onSuccess')
    expect(ui).toContain('onCancel')
  })

  test('UI threads checkout_id metadata for webhook reconciliation', () => {
    const ui = read(FILES.ui)
    expect(ui).toContain('checkout_id: checkout.id')
  })

  test('UI does NOT POST to legacy /v1/checkouts/.../charge', () => {
    const ui = read(FILES.ui)
    expect(ui).not.toContain('/v1/checkouts/client/{client_secret}/charge')
    expect(ui).not.toContain('useCheckoutCharge')
    expect(ui).not.toContain('useCheckoutChargeSubmitStep')
  })

  test('UI uses Blyss design tokens (no shadow cards, accent button)', () => {
    const ui = read(FILES.ui)
    expect(ui).toContain('var(--accent)')
    expect(ui).toContain('var(--text-muted)')
    // No drop-shadow cards (Blyss anti-pattern)
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
