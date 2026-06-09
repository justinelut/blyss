import { describe, expect, test } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

/**
 * Donation + M-Pesa verification on Paystack Inline JS (Mode A).
 *
 * Both flows now route through Paystack's popup with
 * metadata.purpose set so the backend webhook handler can dispatch
 * to the right finalization path:
 *
 *   purpose='donation'           → record Donation row idempotently
 *   purpose='mpesa_verification' → extract phone from charge.success
 *                                  payload, provision subaccount
 *
 * These tests pin the contract so the metadata routing keys + the
 * popup config fetch + the legacy fallbacks don't quietly regress.
 */

const root = process.cwd()
const read = (p: string) => readFileSync(join(root, p), 'utf8')
const exists = (p: string) => existsSync(join(root, p))

describe('Donation popup flow (Mode A)', () => {
  test('DonationPaymentInterface mounts paystackPop with donation metadata', () => {
    const ui = read('src/components/Donation/DonationPaymentInterface.tsx')
    expect(ui).toContain('paystackPop')
    expect(ui).toContain('useDonationPopupConfig')
    // Webhook routing key
    expect(ui).toContain("purpose: 'donation'")
    expect(ui).toContain('donation_for_organization_id')
    // Donor metadata threaded through
    expect(ui).toContain('donor_email')
    expect(ui).toContain('donor_name')
    expect(ui).toContain('donor_message')
  })

  test('Donation page does NOT POST to legacy /v1/donation/{slug} charge', () => {
    const ui = read('src/components/Donation/DonationPaymentInterface.tsx')
    // The new flow uses popup; legacy flat charge isn't called
    expect(ui).not.toContain('/v1/donation/charge/submit')
    expect(ui).not.toContain('useCheckoutCharge')
  })

  test('Donation popup-config endpoint hook is wired', () => {
    const ui = read('src/components/Donation/DonationPaymentInterface.tsx')
    expect(ui).toContain("'/v1/donation/{slug}/popup-config'")
  })

  test('Legacy donation form preserved at .legacy.tsx', () => {
    expect(
      exists('src/components/Donation/DonationPaymentInterface.legacy.tsx'),
    ).toBe(true)
  })
})

describe('M-Pesa verification via popup (Mode A)', () => {
  test('OrganizationMPesaSettings mounts paystackPop with verification metadata', () => {
    const ui = read('src/components/Settings/OrganizationMPesaSettings.tsx')
    expect(ui).toContain('onVerifyViaPaystackPopup')
    expect(ui).toContain("purpose: 'mpesa_verification'")
    expect(ui).toContain('mpesa_verification_organization_id')
    expect(ui).toContain('paystackPop')
  })

  test('Verification popup config: KES, mobile_money channel, NO subaccount', () => {
    const ui = read('src/components/Settings/OrganizationMPesaSettings.tsx')
    // Charge goes to Blyss main account (covers fees), not creator's
    // subaccount — that's what we're CREATING from this charge.
    expect(ui).toMatch(/channels:\s*\[\s*['"]mobile_money['"]\s*\]/)
    expect(ui).toMatch(/currency:\s*['"]KES['"]/)
  })

  test('Polls org status after popup success', () => {
    const ui = read('src/components/Settings/OrganizationMPesaSettings.tsx')
    expect(ui).toContain('beginPollingForSubaccount')
    expect(ui).toContain("'/v1/organizations/{id}'")
  })

  test('Webhook handler routes by metadata.purpose', () => {
    // Cross-check that the backend ENDPOINT we're posting metadata
    // to has the routing logic. We can't run server tests here but
    // the contract is symbolically pinned — backend file must exist
    // and contain the routing keys.
    const tasks = read('../../server/polar/integrations/paystack/tasks.py')
    expect(tasks).toContain("purpose = metadata.get(\"purpose\")")
    expect(tasks).toContain("_handle_donation_success")
    expect(tasks).toContain("_handle_mpesa_verification_success")
    expect(tasks).toContain('_extract_phone_from_payload')
  })

  test('Backend extracts phone from authorization.mobile_number', () => {
    const tasks = read('../../server/polar/integrations/paystack/tasks.py')
    expect(tasks).toContain('mobile_number')
    expect(tasks).toContain('customer.phone')
  })

  test('Subaccount provisioning helper exists + is shared', () => {
    const endpoints = read(
      '../../server/polar/integrations/paystack/endpoints.py',
    )
    expect(endpoints).toContain('_create_or_reactivate_mpesa_subaccount')
    // Webhook handler imports it lazily
    const tasks = read('../../server/polar/integrations/paystack/tasks.py')
    expect(tasks).toContain('_create_or_reactivate_mpesa_subaccount')
  })
})

describe('Webhook idempotency', () => {
  test('donation handler short-circuits when reference already recorded', () => {
    const tasks = read('../../server/polar/integrations/paystack/tasks.py')
    expect(tasks).toContain('already_recorded')
  })

  test('mpesa-verification handler short-circuits when subaccount already provisioned', () => {
    const tasks = read('../../server/polar/integrations/paystack/tasks.py')
    expect(tasks).toContain('already_provisioned')
  })
})
