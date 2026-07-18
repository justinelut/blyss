import type { NextRequest } from 'next/server'
import {
  COUNTRY_COOKIE,
  DEFAULT_COUNTRY,
  currencyForCountry,
  isSupportedCountry,
  normalizeCountry,
} from './index'
import { countryFromPathname } from './path'

export interface ResolvedGeo {
  country: string
  currency: string
  /** Whether middleware should (re)write the country cookie. */
  shouldSetCookie: boolean
}

const countryFromSameOriginReferrer = (request: NextRequest): string | null => {
  const referrer = request.headers.get('referer')
  if (!referrer) return null

  try {
    const url = new URL(referrer)
    if (url.origin !== request.nextUrl.origin) return null
    return countryFromPathname(url.pathname)
  } catch {
    return null
  }
}

/**
 * Resolve the visitor's country + currency for the marketplace.
 *
 * Precedence:
 *   1. Explicit cookie override (the visitor picked a country/currency)
 *   2. Locale on a same-origin referring page (protects older raw links)
 *   3. Cloudflare `cf-ipcountry` or Vercel's country header
 *   4. Default: US / USD — never KES — so international buyers aren't shown a
 *      price they can't be charged.
 */
export function resolveGeo(request: NextRequest): ResolvedGeo {
  const cookieCountry = request.cookies.get(COUNTRY_COOKIE)?.value
  if (isSupportedCountry(cookieCountry)) {
    const country = cookieCountry!.toLowerCase()
    return {
      country,
      currency: currencyForCountry(country),
      // Cookie already set; don't rewrite on every request.
      shouldSetCookie: false,
    }
  }

  const referrerCountry = countryFromSameOriginReferrer(request)
  if (referrerCountry) {
    return {
      country: referrerCountry,
      currency: currencyForCountry(referrerCountry),
      shouldSetCookie: true,
    }
  }

  // Cloudflare adds cf-ipcountry (ISO alpha-2). Vercel uses x-vercel-ip-country.
  const headerCountry =
    request.headers.get('cf-ipcountry') ||
    request.headers.get('x-vercel-ip-country') ||
    null

  const country = normalizeCountry(headerCountry)
  return {
    country: country || DEFAULT_COUNTRY,
    currency: currencyForCountry(country),
    // Persist the geo-detected country so subsequent requests + the client
    // store are stable and the user can later override it.
    shouldSetCookie: true,
  }
}
