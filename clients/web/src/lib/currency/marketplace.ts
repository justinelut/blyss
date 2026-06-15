import { schemas } from '@/lib/api'
import { formatCurrency } from './index'

/**
 * Marketplace-specific currency utilities
 *
 * These utilities extend the base currency formatting for marketplace use cases,
 * including multi-price currency matching and fallback handling.
 */

/**
 * Finds the price for a product in the specified currency
 *
 * @param product - The product with multiple price points
 * @param currency - The currency code to match (e.g., 'kes', 'usd')
 * @returns The matching price or null if not found
 *
 * Requirements: 2.8
 */
export const findPriceForCurrency = (
  product: schemas['Product'] | schemas['CheckoutProduct'],
  currency: string,
): schemas['ProductPrice'] | null => {
  if (!product.prices || product.prices.length === 0) {
    return null
  }

  const price = product.prices.find(
    (p) => p.price_currency.toLowerCase() === currency.toLowerCase(),
  )

  return price || null
}

/**
 * Formats a product price for marketplace display
 *
 * This function:
 * - Finds the price matching the selected currency
 * - Formats it using the appropriate decimal factor (100 for most, 1 for zero-decimal)
 * - Returns the formatted string with currency symbol
 * - Returns null if no price exists for the currency
 *
 * @param product - The product with multiple price points
 * @param currency - The currency code (e.g., 'kes', 'usd')
 * @param mode - Formatting mode (default: 'compact' for marketplace display)
 * @returns Formatted price string or null if not available
 *
 * Requirements: 2.6, 2.7, 2.8
 *
 * @example
 * // Product with KES and USD prices
 * const product = {
 *   prices: [
 *     { price_amount: 120000, price_currency: 'kes' },
 *     { price_amount: 1500, price_currency: 'usd' }
 *   ]
 * }
 *
 * formatProductPrice(product, 'kes') // Returns: "KSh 1,200"
 * formatProductPrice(product, 'usd') // Returns: "$15"
 * formatProductPrice(product, 'eur') // Returns: null (no EUR price)
 *
 * @example
 * // Product with zero-decimal currency (JPY)
 * const product = {
 *   prices: [
 *     { price_amount: 12300, price_currency: 'jpy' }
 *   ]
 * }
 *
 * formatProductPrice(product, 'jpy') // Returns: "¥12,300" (no division)
 */
export const formatProductPrice = (
  product: schemas['Product'] | schemas['CheckoutProduct'],
  currency: string,
  mode: 'compact' | 'standard' | 'accounting' = 'compact',
): string | null => {
  const price = findPriceForCurrency(product, currency)

  if (!price) {
    return null
  }

  return formatCurrency(mode)(price.price_amount, currency)
}

/**
 * Gets a fallback price when the preferred currency is not available.
 *
 * Resolution chain (mirrors the backend `_has_currency` filter on
 * /v1/products/public — see polar/product/endpoints.py — and the cart
 * `_calculate_item_subtotal` resolution chain):
 *
 *   1. Preferred currency  (visitor's geo currency)
 *   2. USD                 (the universal fallback per the marketplace
 *                           contract — every product priced in USD is
 *                           visible to every buyer everywhere)
 *   3. First available     (legacy / single-currency product safety net)
 *
 * KES is NOT in this chain. KES is the creator's local-default currency,
 * not a buyer-side fallback. A Nigerian visitor browsing a product priced
 * [KES, USD] sees USD via step 2, NOT KES via the (previously buggy) "try
 * KES first" rule. That rule shipped the same bug shape /us visitors had
 * with the cart pre-fix — it sent buyers the wrong currency label even
 * when a USD price was available.
 *
 * @param product - The product with multiple price points
 * @param preferredCurrency - The preferred currency code
 * @returns Object with price and currency, or null if no prices exist
 *
 * Requirements: 2.9
 *
 * @example
 * const product = {
 *   prices: [
 *     { price_amount: 120000, price_currency: 'kes' },
 *     { price_amount: 1500, price_currency: 'usd' }
 *   ]
 * }
 *
 * getFallbackPrice(product, 'eur')
 * // Returns: { price: { price_amount: 1500, price_currency: 'usd' }, currency: 'usd' }
 */
export const getFallbackPrice = (
  product: schemas['Product'] | schemas['CheckoutProduct'],
  preferredCurrency: string,
): { price: schemas['ProductPrice']; currency: string } | null => {
  if (!product.prices || product.prices.length === 0) {
    return null
  }

  // Step 1 — preferred currency.
  const preferredPrice = findPriceForCurrency(product, preferredCurrency)
  if (preferredPrice) {
    return { price: preferredPrice, currency: preferredCurrency.toLowerCase() }
  }

  // Step 2 — USD universal fallback. Skip when the visitor IS USD;
  // step 1 already would have matched if a USD price existed.
  if (preferredCurrency.toLowerCase() !== 'usd') {
    const usdPrice = findPriceForCurrency(product, 'usd')
    if (usdPrice) {
      return { price: usdPrice, currency: 'usd' }
    }
  }

  // Step 3 — first available price (single-currency products / legacy
  // data). Reached only when the product has no USD price either.
  const firstPrice = product.prices[0]
  return { price: firstPrice, currency: firstPrice.price_currency }
}
