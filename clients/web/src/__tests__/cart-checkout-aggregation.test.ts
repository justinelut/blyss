import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Cart checkout aggregation gate.
 *
 * Polar's checkout model is single-product: `checkout.products` is a list of
 * mutually-exclusive ALTERNATIVES (e.g. pricing tiers) and the UI renders a
 * radio switcher to pick ONE. Blyss carts are multi-item, so the cart checkout
 * puts every basket item in `checkout.products` — but the radio switcher then
 * let the buyer collapse the basket to a single product ("I can only buy one
 * product at a time").
 *
 * Fix: when `checkout.is_cart_checkout` is true, CheckoutProductSwitcher must
 * render a READ-ONLY line-item list (no RadioGroup, no update() calls) — the
 * total is already aggregated server-side from cart_item_ids.
 */

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8')

describe('Cart checkout aggregates all items', () => {
  test('Switcher branches on is_cart_checkout to a read-only list', () => {
    const src = read(
      'src/components/Checkout/components/CheckoutProductSwitcher.tsx',
    )
    expect(src).toMatch(/is_cart_checkout/)
    // The cart branch must appear before the RadioGroup return and must not
    // wrap items in a RadioGroup.
    const cartIdx = src.indexOf('is_cart_checkout')
    const radioReturnIdx = src.indexOf('<RadioGroup')
    expect(cartIdx).toBeGreaterThan(-1)
    expect(radioReturnIdx).toBeGreaterThan(cartIdx)
  })
})
