'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type PropsWithChildren,
} from 'react'
import { useCurrencyStore } from '@/stores/currencyStore'
import {
  COUNTRY_COOKIE,
  DEFAULT_CURRENCY,
  currencyForCountry,
} from '@/lib/geo'

interface CurrencyContextValue {
  /** Currency to display + filter by (lowercase ISO, e.g. 'usd'). */
  currency: string
  /** Detected/active country (lowercase ISO alpha-2, e.g. 'us'). */
  country: string
  /**
   * Switch to a country: persist the cookie and reload so the server
   * re-resolves the currency and re-filters the product grid (we filter
   * server-side, so the visible products change — a soft reload is required).
   */
  setCountry: (country: string) => void
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

/**
 * Provides the visitor's display currency, seeded server-side from geo so the
 * first paint matches the SSR'd product grid (no flash, no hydration
 * mismatch).
 */
export function CurrencyProvider({
  initialCountry,
  initialCurrency,
  children,
}: PropsWithChildren<{ initialCountry: string; initialCurrency: string }>) {
  const country = (initialCountry || 'us').toLowerCase()
  const currency = (initialCurrency || DEFAULT_CURRENCY).toLowerCase()
  const storeSetCurrency = useCurrencyStore((s) => s.setCurrency)

  // Keep the zustand store (used by cart/wishlist price displays) aligned with
  // the server-resolved currency so every surface agrees.
  useEffect(() => {
    storeSetCurrency(currency)
  }, [currency, storeSetCurrency])

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      country,
      setCountry: (nextCountry: string) => {
        const c = nextCountry.toLowerCase()
        if (typeof document !== 'undefined') {
          document.cookie = `${COUNTRY_COOKIE}=${c}; path=/; max-age=31536000; samesite=lax`
        }
        storeSetCurrency(currencyForCountry(c))
        // Reload so middleware + SSR re-resolve and the grid re-filters.
        if (typeof window !== 'undefined') window.location.reload()
      },
    }),
    [currency, country, storeSetCurrency],
  )

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  )
}

/** Read the visitor's display currency. Falls back to USD outside a provider. */
export function useDisplayCurrency(): string {
  const ctx = useContext(CurrencyContext)
  return ctx?.currency ?? DEFAULT_CURRENCY
}

export function useCurrencyControls(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext)
  if (!ctx) {
    return { currency: DEFAULT_CURRENCY, country: 'us', setCountry: () => {} }
  }
  return ctx
}
