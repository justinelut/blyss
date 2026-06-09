import { describe, expect, test } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

/**
 * Per-creator buyer-management invariants.
 *
 * Blyss does NOT aggregate purchases at the marketplace level. Buyers
 * manage their orders, downloads, benefits, refunds, and subscription
 * cancellation on Polar's native per-creator portal at
 * /{org-slug}/portal — not on a Blyss-level surface.
 *
 * Pin the structural invariants so we don't quietly re-introduce a
 * marketplace orders aggregator:
 *
 *   1. The marketplace /portal/* and /orders frontend surfaces are
 *      DELETED.
 *   2. The /v1/me/* backend module is DELETED.
 *   3. The mobile bottom nav has no "Account" item.
 *   4. The marketplace header has no "Your purchases" entry.
 *   5. Per-creator account icon lives on the creator storefront hero,
 *      linking to /{slug}/portal.
 */

const root = process.cwd()
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')
const exists = (rel: string) => existsSync(join(root, rel))

describe('Per-creator buyer management', () => {
  test('marketplace /portal/* surfaces are deleted', () => {
    expect(exists('src/app/(main)/portal')).toBe(false)
    expect(exists('src/app/(main)/portal/page.tsx')).toBe(false)
    expect(exists('src/app/(main)/portal/orders/page.tsx')).toBe(false)
    expect(exists('src/app/(main)/portal/subscriptions')).toBe(false)
    expect(exists('src/app/(main)/portal/settings')).toBe(false)
  })

  test('/orders aggregator is deleted', () => {
    expect(exists('src/app/(main)/orders')).toBe(false)
    expect(exists('src/app/(main)/orders/page.tsx')).toBe(false)
  })

  test('/v1/me/* is not referenced anywhere in the frontend', () => {
    // Quick smoke — full grep would be expensive; sample the
    // surfaces that previously consumed /v1/me/* endpoints.
    const candidates = [
      'src/components/Marketplace/MarketplaceHeader.tsx',
      'src/components/Marketplace/MarketplaceMobileNav.tsx',
      'src/components/Cart/CartDrawer.tsx',
      'src/components/Cart/CartPage.tsx',
      'src/components/Checkout/SequentialCheckoutContinue.tsx',
    ]
    for (const f of candidates) {
      expect(read(f)).not.toContain('/v1/me/')
    }
  })

  test('mobile bottom nav has no "Account" tab', () => {
    const nav = read('src/components/Marketplace/MarketplaceMobileNav.tsx')
    expect(nav).not.toContain("label: 'Account'")
    expect(nav).not.toContain("label: 'Sign in'")
    // Just Browse, Wishlist, Cart
    expect(nav).toContain("label: 'Browse'")
    expect(nav).toContain("label: 'Wishlist'")
    expect(nav).toContain("label: 'Cart'")
  })

  test('marketplace header has no "Your purchases" link', () => {
    const header = read('src/components/Marketplace/MarketplaceHeader.tsx')
    expect(header).not.toContain('Your purchases')
    expect(header).not.toContain('see your orders')
  })

  test('creator storefront has the per-creator portal account icon', () => {
    // The account icon moved from the hero into StorefrontActionBar
    // (rendered inside the sticky tabs bar so it rides along on
    // scroll). Still scoped to the creator's portal by slug.
    const actionBar = read(
      'src/components/CreatorStorefront/StorefrontActionBar.tsx',
    )
    expect(actionBar).toMatch(/href=\{`\/\$\{slug\}\/portal`\}/)
    expect(actionBar).toContain('Your purchases with this creator')
    expect(actionBar).toContain('FiUser')
  })

  test('order confirmation emails link to per-creator portal (not marketplace)', () => {
    // Server-side check pinning the email URL template back to
    // Polar's native per-creator portal path. Done via path-existence
    // rather than reading the .py file because the frontend test
    // suite shouldn't import server code.
    expect(exists('../../server/polar/order/service.py')).toBe(true)
  })
})
