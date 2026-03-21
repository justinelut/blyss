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
 * Gets a fallback price when the preferred currency is not available
 *
 * This function attempts to find a price in the following order:
 * 1. Preferred currency
 * 2. KES (default currency)
 * 3. USD (common fallback)
 * 4. First available price
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
 * // Returns: { price: { price_amount: 120000, price_currency: 'kes' }, currency: 'kes' }
 */
export const getFallbackPrice = (
  product: schemas['Product'] | schemas['CheckoutProduct'],
  preferredCurrency: string,
): { price: schemas['ProductPrice']; currency: string } | null => {
  if (!product.prices || product.prices.length === 0) {
    return null
  }

  // Try preferred currency first
  const preferredPrice = findPriceForCurrency(product, preferredCurrency)
  if (preferredPrice) {
    return { price: preferredPrice, currency: preferredCurrency }
  }

  // Try KES (default)
  const kesPrice = findPriceForCurrency(product, 'kes')
  if (kesPrice) {
    return { price: kesPrice, currency: 'kes' }
  }

  // Try USD (common fallback)
  const usdPrice = findPriceForCurrency(product, 'usd')
  if (usdPrice) {
    return { price: usdPrice, currency: 'usd' }
  }

  // Use first available price
  const firstPrice = product.prices[0]
  return { price: firstPrice, currency: firstPrice.price_currency }
}
