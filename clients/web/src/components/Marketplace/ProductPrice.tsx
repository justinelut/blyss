'use client'

import { formatCurrency } from '@/lib/currency'
import { schemas } from '@/lib/api'
import { useMemo } from 'react'
import { getFallbackPrice } from '@/lib/currency/marketplace'

interface ProductPriceProps {
  product: schemas['Product'] | schemas['CheckoutProduct']
  currency: string
  className?: string
  mode?: 'compact' | 'standard' | 'accounting'
  showFallback?: boolean
}

/**
 * ProductPrice component for marketplace display
 *
 * Displays product price in the selected currency with proper formatting:
 * - Divides by 100 for most currencies (USD, EUR, GBP, KES, etc.)
 * - Divides by 1 for zero-decimal currencies (JPY, KRW, CLP, PYG, VND)
 * - Shows currency symbol with amount (KSh, $, €, £)
 * - Uses title-lg typography for emphasis
 * - Displays fallback message if product lacks price for selected currency
 * - Optionally shows fallback price in another currency
 *
 * Requirements: 2.6, 2.7, 2.8, 2.9
 */
export const ProductPrice = ({
  product,
  currency,
  className = '',
  mode = 'compact',
  showFallback = true,
}: ProductPriceProps) => {
  const priceInfo = useMemo(() => {
    if (!product.prices || product.prices.length === 0) {
      return null
    }

    // Find price matching the selected currency
    const matchingPrice = product.prices.find(
      (p) => p.price_currency.toLowerCase() === currency.toLowerCase(),
    )

    if (matchingPrice) {
      return {
        price: matchingPrice,
        currency: currency,
        isFallback: false,
      }
    }

    // If no matching price and fallback is enabled, get fallback price
    if (showFallback) {
      const fallback = getFallbackPrice(product, currency)
      if (fallback) {
        return {
          price: fallback.price,
          currency: fallback.currency,
          isFallback: true,
        }
      }
    }

    return null
  }, [product.prices, currency, showFallback])

  if (!priceInfo) {
    return (
      <div className={`text-sm text-muted-foreground ${className}`}>
        Price not available
      </div>
    )
  }

  const formattedPrice = formatCurrency(mode)(
    priceInfo.price.price_amount,
    priceInfo.currency,
  )

  return (
    <div className={className}>
      <div className="text-title-lg font-semibold">{formattedPrice}</div>
      {priceInfo.isFallback && (
        <div className="text-xs text-muted-foreground">
          Price shown in {priceInfo.currency.toUpperCase()}
        </div>
      )}
    </div>
  )
}
