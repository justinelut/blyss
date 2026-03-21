import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

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
  setCurrency: (currency: PresentmentCurrency) => void
}

export const useCurrencyStore = create<CurrencyStore>()(
  persist(
    (set) => ({
      currency: 'kes',
      setCurrency: (currency) => set({ currency }),
    }),
    {
      name: 'blyss-currency',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
