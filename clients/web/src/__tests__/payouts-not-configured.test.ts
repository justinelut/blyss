import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Pin the "Not configured vs Pending" disambiguation in the payout
 * surfaces.
 *
 * The DB column `subaccount_status` defaults to "pending" so a fresh org
 * with no subaccount_code set looked indistinguishable from one whose
 * subaccount creation was actually in flight. The Settings page rendered
 * a spinning "Pending" pill on every fresh org — misleading the creator
 * into thinking the system was working on something when it hadn't even
 * started.
 *
 * Both `OrganizationMPesaSettings` (Settings surface) and `AccountPage`
 * (Finance surface) now read `subaccount_code` and derive
 * `isNotConfigured = !subaccountCode && subaccountStatus !== "active"`,
 * which the Settings badge fn short-circuits on to render a plain
 * "Not configured" pill (no spinner). This test stops a future refactor
 * from quietly going back to the misleading default.
 */

const SETTINGS_FILE = join(
  process.cwd(),
  'src/components/Settings/OrganizationMPesaSettings.tsx',
)
const ACCOUNT_FILE = join(
  process.cwd(),
  'src/app/(main)/dashboard/[organization]/(header)/finance/account/AccountPage.tsx',
)

describe('Payouts surface: differentiate Not Configured from Pending', () => {
  describe('OrganizationMPesaSettings.tsx', () => {
    const src = readFileSync(SETTINGS_FILE, 'utf8')

    test('reads subaccount_code from the organization', () => {
      expect(src).toMatch(/subaccount_code/)
    })

    test('derives isNotConfigured', () => {
      expect(src).toMatch(/isNotConfigured\s*=\s*!subaccountCode/)
    })

    test('badge renders "Not configured" pill when isNotConfigured', () => {
      // The pill text must be the literal "Not configured" — anything else
      // (including "Pending", a spinner, or "Unknown") would re-introduce
      // the original UX bug.
      expect(src).toMatch(
        /if\s*\(\s*isNotConfigured\s*\)[^}]*Not configured/s,
      )
    })

    test('Loader2 spinner is NOT inside the isNotConfigured branch', () => {
      // Slice out the badge fn body so the assertion is local. We expect
      // Loader2 to still exist in the file (it's used elsewhere — Retry
      // button, Verifying state) but NOT inside the early-return branch
      // for isNotConfigured.
      const fnStart = src.indexOf('const getSubaccountStatusBadge')
      expect(fnStart).toBeGreaterThan(0)
      const fnEnd = src.indexOf(
        '}\n  }',
        fnStart,
      )
      expect(fnEnd).toBeGreaterThan(fnStart)
      const fnBody = src.slice(fnStart, fnEnd + 5)

      // Inside the badge fn, the isNotConfigured branch must come BEFORE
      // the switch. We assert the order: 'isNotConfigured' precedes
      // 'switch (subaccountStatus)'.
      const guardIdx = fnBody.indexOf('isNotConfigured')
      const switchIdx = fnBody.indexOf('switch (subaccountStatus)')
      expect(guardIdx).toBeGreaterThan(0)
      expect(switchIdx).toBeGreaterThan(guardIdx)

      // And the early-return up to the switch contains "Not configured"
      // and does NOT contain Loader2 (no spinner on the not-configured
      // pill).
      const guardSlice = fnBody.slice(guardIdx, switchIdx)
      expect(guardSlice).toMatch(/Not configured/)
      expect(guardSlice).not.toMatch(/Loader2/)
    })
  })

  describe('AccountPage.tsx (Finance setup wizard)', () => {
    const src = readFileSync(ACCOUNT_FILE, 'utf8')

    test('reads subaccount_code from the organization', () => {
      expect(src).toMatch(/subaccount_code/)
    })

    test('derives isNotConfigured for downstream consumers', () => {
      // Same derivation pattern. AccountPage doesn't render its own
      // Pending badge today, but exposing the flag here keeps the two
      // surfaces in lockstep — if someone adds a payout-status pill to
      // AccountPage later, the variable is already wired.
      expect(src).toMatch(/isNotConfigured\s*=\s*!subaccountCode/)
    })
  })
})
