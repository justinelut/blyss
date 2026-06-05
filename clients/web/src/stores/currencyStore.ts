import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  COUNTRY_COOKIE,
  DEFAULT_CURRENCY,
  currencyForCountry,
} from '@/lib/geo'

type PresentmentCurrency =
  | 'kes'
  | 'usd'
  | 'eur'
  | 'gbp'
  | 'jpy'
  | 'krw'
  | string

interface CurrencyStore {
  currency: PresentmentCurrency
  /** True once the user explicitly picked a currency (don't override w/ geo). */
  userSelected: boolean
  setCurrency: (currency: PresentmentCurrency) => void
  /** Reconcile with the geo-detected currency (from the blyss-country cookie)
   *  unless the user explicitly chose one. */
  syncWithGeo: () => void
}

/** Read the geo-resolved currency from the blyss-country cookie (client-side).
 *  Defaults to USD — never KES — for the rest of the world. */
function geoCurrencyFromCookie(): PresentmentCurrency {
  if (typeof document === 'undefined') return DEFAULT_CURRENCY
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${COUNTRY_COOKIE}=`))
  if (!match) return DEFAULT_CURRENCY
  const country = decodeURIComponent(match.split('=')[1] || '')
  return currencyForCountry(country)
}

export const useCurrencyStore = create<CurrencyStore>()(
  persist(
    (set, get) => ({
      // Default to the geo currency (USD for unknown), NOT a hardcoded KES.
      currency: geoCurrencyFromCookie(),
      userSelected: false,
      setCurrency: (currency) => set({ currency, userSelected: true }),
      syncWithGeo: () => {
        if (get().userSelected) return
        const geo = geoCurrencyFromCookie()
        if (geo !== get().currency) set({ currency: geo })
      },
    }),
    {
      name: 'blyss-currency',
      storage: createJSONStorage(() => localStorage),
      // On rehydrate, if the user never explicitly picked a currency, realign
      // with the geo cookie so a stale persisted value (e.g. an old 'kes')
      // doesn't override the visitor's actual region.
      onRehydrateStorage: () => (state) => {
        if (state && !state.userSelected) {
          state.currency = geoCurrencyFromCookie()
        }
      },
    },
  ),
)
