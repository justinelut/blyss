/**
 * No-Lucide gate for the customer-facing marketplace surface.
 *
 * Per blyss-design (authoritative override): "no Lucide. Add no new icon
 * dependency." Marketplace + product-detail + cart + wishlist + creators +
 * the public-route pages must use react-icons (already installed) only. The
 * dashboard is allowed to keep lucide for now — its import is unaffected.
 *
 * If this test fails, you've reintroduced a `lucide-react` import into a
 * customer file. Replace it with the matching `Fi*` from `react-icons/fi`
 * (Feather), or `Hi*` from `react-icons/hi2` if Feather doesn't have it.
 */
import { describe, expect, it } from 'vitest'
import { execSync } from 'node:child_process'
import { resolve } from 'node:path'

// Customer-facing component + page roots. Dashboard, oauth2, onboarding,
// finance, settings are NOT in this list — they're internal and may use
// lucide until separately migrated.
const CUSTOMER_PATHS = [
  'src/components/Marketplace',
  'src/components/MarketplaceV2',
  'src/components/ProductDetail',
  'src/components/Cart',
  'src/components/Wishlist',
  'src/components/CreatorStorefront',
  'src/components/Creators',
  'src/components/Onboarding',
  'src/components/Login',
  'src/app/(main)/(website)',
  'src/app/(main)/creators',
  'src/app/(main)/product',
  'src/app/(main)/search',
  'src/app/(main)/cart',
  'src/app/(main)/wishlist',
  'src/app/(main)/start',
  'src/app/(main)/help',
  'src/app/(main)/login',
  'src/app/(main)/category',
  'src/app/(main)/products',
  'src/app/(main)/about',
  'src/app/(main)/refunds',
  'src/app/(main)/privacy',
  'src/app/(main)/acceptable-use',
  'src/app/(main)/terms',
  'src/app/(main)/verify-email',
  'src/app/(main)/donation',
]

describe('no lucide on customer surface (blyss-design override)', () => {
  it('finds zero lucide-react imports across customer-facing files', () => {
    const root = resolve(__dirname, '..', '..')
    // grep -rln returns paths with matches; non-zero exit when no match. We
    // tolerate the no-match exit by trapping it.
    let output = ''
    try {
      output = execSync(
        `grep -rln "lucide-react" ${CUSTOMER_PATHS.map((p) => `'${p}'`).join(' ')} 2>/dev/null || true`,
        { cwd: root, encoding: 'utf8' },
      )
    } catch {
      // grep returns 1 when nothing matches — treat as success.
      output = ''
    }
    const offenders = output
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    expect(
      offenders,
      `Customer-facing files must not import lucide-react. Replace with react-icons/fi (Fi*) or react-icons/hi2 (Hi*). Offenders:\n  ${offenders.join('\n  ')}`,
    ).toEqual([])
  })
})
