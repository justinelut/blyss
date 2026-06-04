import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Digital marketplace quantity rule.
 *
 * Blyss only sells digital goods. Every cart item is logically "is this
 * product in the cart, yes/no" — the quantity column is always 1. This
 * gate locks down two related invariants on the frontend:
 *
 *   1. Cart-row UIs must NOT render a "Quantity: N" label that would
 *      mislead the buyer or imply a stepper exists.
 *   2. Buy Now / Add-to-cart still passes `quantity: 1` to the API
 *      (the server enforces the cap, but the frontend should also ask
 *      for 1 so analytics + retries are consistent).
 *
 * If we ever ship physical or seat-based products, this gate gets
 * scoped to the digital subset of products.
 */

const CART_ITEM_ROW = readFileSync(
  join(process.cwd(), 'src/components/Cart/CartItemRow.tsx'),
  'utf8',
)
const CART_ITEM = readFileSync(
  join(process.cwd(), 'src/components/Cart/CartItem.tsx'),
  'utf8',
)
const PDP = readFileSync(
  join(
    process.cwd(),
    'src/components/ProductDetail/ProductDetailClient.tsx',
  ),
  'utf8',
)

describe('Digital marketplace quantity rule', () => {
  test('CartItemRow does not render a Qty label', () => {
    expect(CART_ITEM_ROW).not.toMatch(/Qty:\s*\{item\.quantity\}/)
    expect(CART_ITEM_ROW).not.toMatch(/Quantity:\s*\{item\.quantity\}/)
  })

  test('CartItem does not render a Quantity label', () => {
    expect(CART_ITEM).not.toMatch(/Quantity:\s*\{item\.quantity\}/)
  })

  test('Buy Now adds with quantity: 1', () => {
    expect(PDP).toMatch(/quantity:\s*1/)
    // No higher-than-1 quantity literal anywhere in PDP add-to-cart path.
    expect(PDP).not.toMatch(/quantity:\s*[2-9]\d*/)
  })
})
