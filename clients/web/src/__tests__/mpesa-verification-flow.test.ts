import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Two-step M-Pesa verification gate.
 *
 * The settings screen drives a real KSh 100 inbound charge from the
 * creator's M-Pesa as anti-fraud verification. The flow is:
 *   1. POST /v1/integrations/paystack/organizations/{id}/mpesa/initiate-verification
 *      → Paystack pushes an STK prompt to the creator's phone.
 *   2. POST /v1/integrations/paystack/organizations/{id}/mpesa/finalize-verification
 *      with the returned reference → confirms the charge succeeded and
 *      provisions a Paystack subaccount with settlement_bank=MPESA.
 *
 * Locks down:
 *   - Both endpoint paths exist verbatim in the component.
 *   - The dead "Verify M-Pesa" / `/mpesa/verify` legacy pair is gone so a
 *     future refactor can't silently restore the broken /transfer flow.
 *   - The KSh 100 (not KSh 10) anti-fraud copy is in place so we don't
 *     drift back to the wrong-direction wording.
 */

const FILE = join(
  process.cwd(),
  'src/components/Settings/OrganizationMPesaSettings.tsx',
)

describe('Two-step M-Pesa verification', () => {
  const src = readFileSync(FILE, 'utf8')

  test('initiate-verification endpoint is wired', () => {
    expect(src).toContain(
      "/v1/integrations/paystack/organizations/{id}/mpesa/initiate-verification",
    )
  })

  test('finalize-verification endpoint is wired', () => {
    expect(src).toContain(
      "/v1/integrations/paystack/organizations/{id}/mpesa/finalize-verification",
    )
  })

  test('legacy /mpesa/verify endpoint is no longer called', () => {
    expect(src).not.toMatch(
      /'\/v1\/integrations\/paystack\/organizations\/\{id\}\/mpesa\/verify'/,
    )
  })

  test('KSh 100 anti-fraud copy is present', () => {
    expect(src).toContain('KSh 100')
    expect(src).toContain('non-refundable')
  })

  test('legacy KES 10 / KSh 10 wording is gone', () => {
    expect(src).not.toMatch(/KES\s*10\b/)
    expect(src).not.toMatch(/KSh\s*10\b(?!\s*0)/)
  })

  test('STK-push instruction card is rendered', () => {
    expect(src).toContain('STK push')
    expect(src).toMatch(/Approve KSh 100|approved on M-Pesa/)
  })
})
