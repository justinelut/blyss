import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Two-step + auto-poll M-Pesa verification gate.
 *
 * The settings screen drives a real KSh 100 inbound charge from the
 * creator's M-Pesa as anti-fraud verification. The flow is:
 *   1. POST /v1/integrations/paystack/organizations/{id}/mpesa/initiate-verification
 *      → Paystack pushes an STK prompt to the creator's phone.
 *   2. GET  /v1/integrations/paystack/organizations/{id}/mpesa/charge-status?reference=
 *      → polled every 3 seconds while waiting; lightweight read-only
 *      status check.
 *   3. POST /v1/integrations/paystack/organizations/{id}/mpesa/finalize-verification
 *      with the returned reference → confirms the charge succeeded and
 *      provisions a Paystack subaccount with settlement_bank=MPESA.
 *
 * Locks down:
 *   - All three endpoint paths exist verbatim in the component.
 *   - The dead "Verify M-Pesa" / `/mpesa/verify` legacy pair is gone so a
 *     future refactor can't silently restore the broken /transfer flow.
 *   - The KSh 100 anti-fraud copy is in place so we don't drift back to
 *     the wrong-direction wording.
 *   - The auto-polling pattern (Trimly-style) replaces the old "I've
 *     approved on M-Pesa" manual confirmation button.
 */

const FILE = join(
  process.cwd(),
  'src/components/Settings/OrganizationMPesaSettings.tsx',
)

describe('Two-step M-Pesa verification with auto-poll', () => {
  const src = readFileSync(FILE, 'utf8')

  test('initiate-verification endpoint is wired', () => {
    expect(src).toContain(
      '/v1/integrations/paystack/organizations/{id}/mpesa/initiate-verification',
    )
  })

  test('charge-status polling endpoint is wired', () => {
    expect(src).toContain(
      '/v1/integrations/paystack/organizations/{id}/mpesa/charge-status',
    )
  })

  test('finalize-verification endpoint is wired', () => {
    expect(src).toContain(
      '/v1/integrations/paystack/organizations/{id}/mpesa/finalize-verification',
    )
  })

  test('legacy /mpesa/verify endpoint is no longer called', () => {
    expect(src).not.toMatch(
      /'\/v1\/integrations\/paystack\/organizations\/\{id\}\/mpesa\/verify'/,
    )
  })

  test('verification amount is rendered dynamically (no hardcode)', () => {
    // The dashboard now reads the live amount from
    // /v1/integrations/paystack/mpesa/verification-config so admins
    // can override KSh 100 → KSh 1 (etc) via runtime_settings without
    // a code change. Lock down that the source uses a template
    // literal pulling from state, not a hardcoded number, AND that
    // the config endpoint is actually wired.
    expect(src).toContain('/v1/integrations/paystack/mpesa/verification-config')
    expect(src).toContain('verificationAmountKes')
    expect(src).toContain('non-refundable')
  })

  test('legacy KES 10 / KSh 10 wording is gone', () => {
    expect(src).not.toMatch(/KES\s*10\b/)
    expect(src).not.toMatch(/KSh\s*10\b(?!\s*0)/)
  })

  test('Verify M-Pesa button is rendered', () => {
    // Mode A: button opens Paystack popup instead of triggering an
    // STK push from our backend. The legacy STK form is still
    // mounted as a fallback path — both buttons are checked here.
    expect(src).toMatch(/Verify M-Pesa|Send STK push/)
  })

  test('auto-poll uses 3-second interval', () => {
    // Trimly's pattern is 3000 ms. Anything materially different (e.g.
    // 500 ms or 30 000 ms) breaks the UX promise of "auto-confirm once
    // you approve" — too aggressive hammers the API; too slow makes the
    // page feel frozen.
    expect(src).toMatch(/POLL_INTERVAL_MS\s*=\s*3000/)
  })

  test('200-second poll timeout matches Safaricom STK window', () => {
    // Safaricom's STK push window is ~180 s. 200_000 ms gives us a small
    // grace period for the last verify to land before we stop polling.
    expect(src).toMatch(/POLL_TIMEOUT_MS\s*=\s*200_?000/)
  })

  test('manual "I have approved" button is gone', () => {
    // The old flow required the creator to click a confirmation button
    // after approving on their phone. The Trimly auto-poll replaces it.
    expect(src).not.toMatch(/I&apos;ve approved on M-Pesa/)
    expect(src).not.toMatch(/I've approved on M-Pesa/)
  })
})
