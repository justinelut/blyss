import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Guest checkout-intent gate.
 *
 * Guests used to trigger silent 401s: the global cart icon polled /v1/cart,
 * every product view polled /v1/wishlist/check, and clicking "Buy" / wishlist
 * fired authenticated mutations that 401'd with no UI feedback.
 *
 * The fix:
 *   - Cart + wishlist queries are gated on authentication so guests never poll
 *     them (no console/Sentry 401 noise).
 *   - Clicking Buy / Wishlist as a guest opens the sign-in modal so they can
 *     authenticate and continue to purchase.
 */

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8')

describe('Guest checkout intent — sign-in instead of 401', () => {
  test('useCart is gated on an enabled flag', () => {
    const cart = read('src/hooks/queries/cart.ts')
    expect(cart).toMatch(/export const useCart = \(enabled = true\)/)
    expect(cart).toMatch(/enabled,/)
  })

  test('useIsInWishlist is gated on auth', () => {
    const wl = read('src/hooks/queries/wishlist.ts')
    expect(wl).toMatch(/useIsInWishlist = \(productId: string, enabled = true\)/)
    expect(wl).toMatch(/enabled: !!productId && enabled/)
  })

  test('Cart header components pass authentication into useCart', () => {
    for (const f of [
      'src/components/Cart/CartButton.tsx',
      'src/components/Cart/CartIcon.tsx',
      'src/components/Cart/CartDrawer.tsx',
      'src/components/Cart/BlyssCartPage.tsx',
    ]) {
      const src = read(f)
      expect(src).toMatch(/useAuth/)
      expect(src).toMatch(/useCart\(authenticated\)/)
    }
  })

  test('Product detail shows the sign-in modal for guests, not a 401', () => {
    const client = read(
      'src/components/ProductDetail/ProductDetailClient.tsx',
    )
    expect(client).toContain('<AuthModal')
    expect(client).toMatch(/setAuthModalOpen\(true\)/)
    expect(client).toMatch(/useIsInWishlist\(product\.id, authenticated\)/)
  })

  test('Guest cart page prompts sign-in', () => {
    const page = read('src/components/Cart/BlyssCartPage.tsx')
    expect(page).toMatch(/if \(!authenticated\)/)
    expect(page).toMatch(/Sign in to view your cart/)
  })
})
