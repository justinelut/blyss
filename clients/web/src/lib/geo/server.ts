import { cookies, headers } from 'next/headers'
import {
  COUNTRY_COOKIE,
  DEFAULT_COUNTRY,
  DEFAULT_CURRENCY,
  currencyForCountry,
  normalizeCountry,
} from './index'

/**
 * Read the resolved country + currency in a server component / route handler.
 *
 * The middleware (proxy.ts) sets `x-blyss-country` / `x-blyss-currency`
 * request headers and a `blyss-country` cookie. We read the header first
 * (always present on a request that went through middleware), then fall back
 * to the cookie, then to US/USD.
 *
 * Use the returned `currency` to filter + price every public product fetch so
 * the first server render is already in the visitor's currency (no flash, no
 * conversion).
 */
export async function getServerGeo(): Promise<{
  country: string
  currency: string
}> {
  try {
    const h = await headers()
    const headerCurrency = h.get('x-blyss-currency')
    const headerCountry = h.get('x-blyss-country')
    if (headerCurrency && headerCountry) {
      return { country: headerCountry, currency: headerCurrency }
    }
  } catch {
    // headers() unavailable (e.g. static context) — fall through to cookie.
  }

  try {
    const c = await cookies()
    const cookieCountry = c.get(COUNTRY_COOKIE)?.value
    if (cookieCountry) {
      const country = normalizeCountry(cookieCountry)
      return { country, currency: currencyForCountry(country) }
    }
  } catch {
    // ignore
  }

  return { country: DEFAULT_COUNTRY, currency: DEFAULT_CURRENCY }
}

export async function getServerCurrency(): Promise<string> {
  return (await getServerGeo()).currency
}
