/**
 * Geo → currency resolution for the marketplace.
 *
 * Universal model:
 *   - Every ISO 3166-1 alpha-2 country code is a valid storefront region
 *     (so a visitor from any country lands on /{their-country}/ instead
 *     of bouncing to /us). The visible URL reflects where the buyer is.
 *   - Currency is derived per-product, not per-country: each product
 *     surfaces in either the visitor's mapped currency OR USD (the
 *     universal fallback). Creators who price in USD reach every buyer
 *     in the world. Creators who price only in their local currency
 *     (e.g. KES-only) stay region-locked to that country.
 *   - The country -> currency map below is opportunistic. We still set a
 *     visitor-currency header so KE visitors see "KSh", DE visitors see
 *     "EUR", etc. when the creator priced in those currencies. Anything
 *     not in the map maps to USD as the default presentment currency.
 *
 * Why USD as the universal fallback (not a per-country flag): Paystack
 * supports KES + USD + GHS + NGN + ZAR for our merchant region. USD is
 * the only one every Paystack subaccount can settle, so a creator who
 * lists in USD reaches everyone everywhere — including buyers from
 * countries Paystack doesn't yet support locally.
 */

export const DEFAULT_COUNTRY = 'us'
export const DEFAULT_CURRENCY = 'usd'

/** Opportunistic ISO 3166-1 alpha-2 (lowercase) → ISO 4217 currency
 *  (lowercase) map. Drives the visitor-currency header. Anything not
 *  in this map maps to USD by default — buyers from un-mapped
 *  countries see USD prices for products priced universally in USD,
 *  and the creator's local prices when those local currencies match.
 *
 *  Add a country here when you want its visitors to land on a non-USD
 *  default currency. Adding a row only changes the default; the
 *  visitor can still switch via the currency picker. */
const COUNTRY_CURRENCY: Record<string, string> = {
  // East Africa
  ke: 'kes',
  ug: 'ugx',
  tz: 'tzs',
  rw: 'rwf',
  // West Africa
  ng: 'ngn',
  gh: 'ghs',
  // Southern Africa
  za: 'zar',
  // North America
  us: 'usd',
  ca: 'cad',
  // UK + Ireland
  gb: 'gbp',
  ie: 'eur',
  // Eurozone (subset)
  de: 'eur',
  fr: 'eur',
  es: 'eur',
  it: 'eur',
  nl: 'eur',
  be: 'eur',
  pt: 'eur',
  at: 'eur',
  fi: 'eur',
  gr: 'eur',
  // Pacific
  au: 'aud',
  nz: 'nzd',
  // Asia
  in: 'inr',
  jp: 'jpy',
  sg: 'sgd',
}

/**
 * Whether a country code is supported as a storefront region.
 *
 * Universal acceptance: any 2-letter alpha-2 is treated as supported so
 * the URL bar reflects the actual visitor country (ISO codes are a
 * closed set — about 250 codes, not the open internet). Empty / null /
 * non-2-letter values fail the check.
 *
 * The country->currency map above is opportunistic and only governs
 * the default currency, not whether the country is "supported".
 */
export function isSupportedCountry(country: string | null | undefined): boolean {
  if (!country) return false
  return /^[a-z]{2}$/i.test(country.trim())
}

/**
 * For backwards compatibility, expose the curated map as a list of
 * "first-class" countries. The actual support set is universal (see
 * isSupportedCountry above) — this list is only used by the currency
 * picker to highlight high-traffic regions.
 */
export const SUPPORTED_COUNTRIES = Object.keys(COUNTRY_CURRENCY)

export const COUNTRY_COOKIE = 'blyss-country'

/** Normalize any incoming country code. Returns the lowercased code if
 *  it looks like a valid alpha-2, otherwise the default ('us'). */
export function normalizeCountry(country: string | null | undefined): string {
  const c = (country || '').toLowerCase().trim()
  return isSupportedCountry(c) ? c : DEFAULT_COUNTRY
}

/** Map a country code to its presentment currency. Unknown → USD. */
export function currencyForCountry(country: string | null | undefined): string {
  const c = (country || '').toLowerCase().trim()
  return COUNTRY_CURRENCY[c] ?? DEFAULT_CURRENCY
}

/** Human label for a currency, used by the switcher. Anything missing
 *  falls back to the uppercased ISO code. */
export const CURRENCY_LABELS: Record<string, string> = {
  usd: 'USD',
  kes: 'KSh',
  gbp: 'GBP',
  eur: 'EUR',
  ngn: 'NGN',
  ghs: 'GHS',
  zar: 'ZAR',
  cad: 'CAD',
  aud: 'AUD',
  nzd: 'NZD',
  inr: 'INR',
  jpy: 'JPY',
  sgd: 'SGD',
  ugx: 'UGX',
  tzs: 'TZS',
  rwf: 'RWF',
}
