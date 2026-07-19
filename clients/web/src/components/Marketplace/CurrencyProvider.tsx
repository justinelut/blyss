"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type PropsWithChildren,
} from "react";
import { useCurrencyStore } from "@/stores/currencyStore";
import {
  COUNTRY_COOKIE,
  COUNTRY_SOURCE_COOKIE,
  DEFAULT_COUNTRY,
  DEFAULT_CURRENCY,
  currencyForCountry,
} from "@/lib/geo";
import { switchMarketplaceCountry } from "@/lib/geo/path";

interface CurrencyContextValue {
  /** Currency to display + filter by (lowercase ISO, e.g. 'usd'). */
  currency: string;
  /** Detected/active country (lowercase ISO alpha-2, e.g. 'ke'). */
  country: string;
  /** Persist an explicit buyer choice and navigate to the equivalent URL. */
  setCountry: (country: string) => void;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

/**
 * Provides the visitor's display currency, seeded server-side from Proxy so
 * the first paint matches the SSR product feed. Automatic hydration must not
 * mark the value as user-selected; only the country switcher may do that.
 */
export function CurrencyProvider({
  initialCountry,
  initialCurrency,
  children,
}: PropsWithChildren<{ initialCountry: string; initialCurrency: string }>) {
  const country = (initialCountry || DEFAULT_COUNTRY).toLowerCase();
  const currency = (
    initialCurrency || currencyForCountry(country)
  ).toLowerCase();
  const setDetectedCurrency = useCurrencyStore((s) => s.setDetectedCurrency);
  const setSelectedCurrency = useCurrencyStore((s) => s.setCurrency);

  useEffect(() => {
    setDetectedCurrency(currency);
  }, [currency, setDetectedCurrency]);

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      country,
      setCountry: (nextCountry: string) => {
        const c = nextCountry.toLowerCase();
        if (typeof document !== "undefined") {
          const secure =
            window.location.protocol === "https:" ? "; secure" : "";
          document.cookie = `${COUNTRY_COOKIE}=${c}; path=/; max-age=31536000; samesite=lax${secure}`;
          document.cookie = `${COUNTRY_SOURCE_COOKIE}=user; path=/; max-age=31536000; samesite=lax${secure}`;
        }
        setSelectedCurrency(currencyForCountry(c));

        // The locale segment is the server-side source of truth. Preserve the
        // current path, query, and fragment while replacing only the country.
        if (typeof window !== "undefined") {
          const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
          window.location.assign(switchMarketplaceCountry(currentHref, c));
        }
      },
    }),
    [currency, country, setSelectedCurrency],
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useDisplayCurrency(): string {
  const ctx = useContext(CurrencyContext);
  return ctx?.currency ?? DEFAULT_CURRENCY;
}

export function useCurrencyControls(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    return {
      currency: DEFAULT_CURRENCY,
      country: DEFAULT_COUNTRY,
      setCountry: () => {},
    };
  }
  return ctx;
}
