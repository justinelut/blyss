/**
 * Geo → currency resolution for the marketplace.
 *
 * Blyss does NOT convert currencies. A visitor only sees products the creator
 * priced in the visitor's currency, and pays in that exact currency via
 * Paystack. So we must resolve the visitor's currency early (middleware /
 * server component) and thread it into every public product fetch.
 *
 * Country comes from Cloudflare's `cf-ipcountry` request header (free, since
 * Blyss is behind Cloudflare). The URL carries the country as a `/{country}`
 * segment (e.g. /ke, /us) so it's shareable + cacheable. A cookie override
 * lets the visitor switch country/currency manually.
 *
 * Default for the rest of the world is the US / USD — never KES — so an
 * international buyer is never shown a price they can't be charged.
 */

export const DEFAULT_COUNTRY = 'us'
export const DEFAULT_CURRENCY = 'usd'

/** ISO 3166-1 alpha-2 (lowercase) → ISO 4217 currency (lowercase). */
const COUNTRY_CURRENCY: Record<string, string> = {
  ke: 'kes',
  us: 'usd',
  gb: 'gbp',
  ng: 'ngn',
  gh: 'ghs',
  za: 'zar',
  // Eurozone (subset of common ones) → eur
  de: 'eur',
  fr: 'eur',
  es: 'eur',
  it: 'eur',
  nl: 'eur',
  ie: 'eur',
  pt: 'eur',
}

/** Countries we expose as first-class storefront regions (URL segments). */
export const SUPPORTED_COUNTRIES = Object.keys(COUNTRY_CURRENCY)

export const COUNTRY_COOKIE = 'blyss-country'

export function isSupportedCountry(country: string | null | undefined): boolean {
  return !!country && SUPPORTED_COUNTRIES.includes(country.toLowerCase())
}

/** Normalize any incoming country code to a supported one (else default). */
export function normalizeCountry(country: string | null | undefined): string {
  const c = (country || '').toLowerCase()
  return isSupportedCountry(c) ? c : DEFAULT_COUNTRY
}

/** Map a country code to its presentment currency. Unknown → USD. */
export function currencyForCountry(country: string | null | undefined): string {
  const c = (country || '').toLowerCase()
  return COUNTRY_CURRENCY[c] ?? DEFAULT_CURRENCY
}

/** Human label for a currency, for the switcher. */
export const CURRENCY_LABELS: Record<string, string> = {
  usd: 'USD',
  kes: 'KSh',
  gbp: 'GBP',
  eur: 'EUR',
  ngn: 'NGN',
  ghs: 'GHS',
  zar: 'ZAR',
}
