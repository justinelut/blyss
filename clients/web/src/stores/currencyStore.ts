import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  COUNTRY_COOKIE,
  DEFAULT_CURRENCY,
  currencyForCountry,
} from "@/lib/geo";

type PresentmentCurrency =
  | "kes"
  | "usd"
  | "eur"
  | "gbp"
  | "jpy"
  | "krw"
  | string;

interface CurrencyStore {
  currency: PresentmentCurrency;
  /** True only when a buyer explicitly changed currency/country. */
  userSelected: boolean;
  setCurrency: (currency: PresentmentCurrency) => void;
  /** Apply the currency resolved by Proxy without creating a user override. */
  setDetectedCurrency: (currency: PresentmentCurrency) => void;
  syncWithGeo: () => void;
}

function geoCurrencyFromCookie(): PresentmentCurrency {
  if (typeof document === "undefined") return DEFAULT_CURRENCY;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COUNTRY_COOKIE}=`));
  if (!match) return DEFAULT_CURRENCY;
  const country = decodeURIComponent(match.split("=")[1] || "");
  return currencyForCountry(country);
}

export const useCurrencyStore = create<CurrencyStore>()(
  persist(
    (set, get) => ({
      currency: geoCurrencyFromCookie(),
      userSelected: false,
      setCurrency: (currency) => set({ currency, userSelected: true }),
      setDetectedCurrency: (currency) => set({ currency, userSelected: false }),
      syncWithGeo: () => {
        if (get().userSelected) return;
        const geo = geoCurrencyFromCookie();
        if (geo !== get().currency) set({ currency: geo });
      },
    }),
    {
      name: "blyss-currency",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state && !state.userSelected) {
          state.currency = geoCurrencyFromCookie();
        }
      },
    },
  ),
);
