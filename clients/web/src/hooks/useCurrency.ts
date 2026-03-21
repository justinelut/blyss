'use client'

import { useCurrencyStore } from '@/stores/currencyStore'
import { useCallback } from 'react'

/**
 * Hook for accessing and managing currency selection
 *
 * This hook provides:
 * - Current selected currency
 * - Function to update currency
 * - Automatic localStorage persistence
 *
 * Requirements: 2.3, 2.5
 *
 * @example
 * function MyComponent() {
 *   const { currency, setCurrency } = useCurrency()
 *
 *   return (
 *     <div>
 *       <p>Current: {currency}</p>
 *       <button onClick={() => setCurrency('usd')}>Switch to USD</button>
 *     </div>
 *   )
 * }
 */
export const useCurrency = () => {
  const currency = useCurrencyStore((state) => state.currency)
  const setCurrency = useCurrencyStore((state) => state.setCurrency)

  const handleCurrencyChange = useCallback(
    (newCurrency: string) => {
      setCurrency(newCurrency)
    },
    [setCurrency],
  )

  return {
    currency,
    setCurrency: handleCurrencyChange,
  }
}
