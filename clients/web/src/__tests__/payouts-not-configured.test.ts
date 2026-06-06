import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Pin the "Not configured vs Pending" disambiguation in the payout
 * surfaces.
 *
 * The DB column `subaccount_status` defaults to "pending" so a fresh org
 * with no subaccount_code set looked indistinguishable from one whose
 * subaccount creation was actually in flight. The Settings page used to
 * render a spinning "Pending" pill on every fresh org — misleading the
 * creator into thinking the system was working on something when it
 * hadn't even started.
 *
 * The redesigned `OrganizationMPesaSettings` (Trimly-style waiting
 * pattern) reads `subaccount_code` and derives
 * `isNotConfigured = !subaccountCode && subaccountStatus !== "active"`,
 * then uses that flag to render "Not configured yet" status copy
 * directly — no spinner, no misleading "in flight" signal. This test
 * stops a future refactor from quietly going back to the misleading
 * default.
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

    test('renders "Not configured" copy when isNotConfigured is true', () => {
      // The status row reads from isNotConfigured. The copy must clearly
      // say the creator hasn't started yet (anything else — "Pending",
      // a spinner, "Unknown" — would re-introduce the original UX bug).
      expect(src).toMatch(/isNotConfigured[^]*?Not configured/i)
    })

    test('does not render a Loader2 spinner alongside Not configured', () => {
      // The Trimly-pattern redesign uses react-icons (FiRefreshCw with
      // animate-spin in the Retry button only). lucide's Loader2 must
      // not return — a spinner next to "Not configured" is the exact
      // bug this regression test exists to prevent.
      expect(src).not.toMatch(/from ['"]lucide-react['"]/)
      expect(src).not.toMatch(/<Loader2/)
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
