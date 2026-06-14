import { describe, expect, it } from 'vitest'
import { isSupportedCountry, currencyForCountry } from '@/lib/geo'

/**
 * Locale URL handling — locks in the behavior implemented in proxy.ts and
 * LocaleLink.tsx without booting a Next.js server.
 *
 * proxy.ts logic is tested indirectly here: we replicate the regex it uses
 * to extract a country segment, and assert support coverage matches the geo
 * map.
 */

const extractLocaleSegment = (
  pathname: string,
): { country: string; rest: string } | null => {
  const match = pathname.match(/^\/([a-z]{2})(\/.*)?$/i)
  if (!match) return null
  const country = match[1].toLowerCase()
  if (!isSupportedCountry(country)) return null
  return { country, rest: match[2] || '/' }
}

describe('locale URL handling', () => {
  it('recognizes /us as the US locale segment + USD currency', () => {
    expect(extractLocaleSegment('/us/marketplace')).toEqual({
      country: 'us',
      rest: '/marketplace',
    })
    expect(currencyForCountry('us')).toBe('usd')
  })

  it('recognizes /ke as Kenya + KES', () => {
    expect(extractLocaleSegment('/ke/product/abc')).toEqual({
      country: 'ke',
      rest: '/product/abc',
    })
    expect(currencyForCountry('ke')).toBe('kes')
  })

  it('treats / + bare locale as the locale root', () => {
    expect(extractLocaleSegment('/us')).toEqual({ country: 'us', rest: '/' })
    expect(extractLocaleSegment('/ke')).toEqual({ country: 'ke', rest: '/' })
  })

  it('returns null for un-prefixed paths', () => {
    expect(extractLocaleSegment('/marketplace')).toBeNull()
    expect(extractLocaleSegment('/product/123')).toBeNull()
    expect(extractLocaleSegment('/')).toBeNull()
  })

  it('accepts every 2-letter country code (universal acceptance)', () => {
    // 2026-06: switched to universal alpha-2 acceptance so visitors
    // from any country in the world land on /{their-country}/ instead
    // of a forced /us redirect. Currency for un-mapped countries
    // resolves to USD via currencyForCountry().
    expect(extractLocaleSegment('/aa/marketplace')).toEqual({
      country: 'aa',
      rest: '/marketplace',
    })
    expect(extractLocaleSegment('/fk/marketplace')).toEqual({
      country: 'fk',
      rest: '/marketplace',
    })
    // Currency for both above falls back to USD.
    expect(currencyForCountry('aa')).toBe('usd')
    expect(currencyForCountry('fk')).toBe('usd')
  })

  it('returns null for 3+ letter prefixes (avoids matching dashboard, login, etc.)', () => {
    expect(extractLocaleSegment('/dashboard')).toBeNull()
    expect(extractLocaleSegment('/dashboard/foo')).toBeNull()
    expect(extractLocaleSegment('/login')).toBeNull()
    expect(extractLocaleSegment('/marketplace/something')).toBeNull()
  })

  it('preserves the rest of the path including query-shaped trailing segments', () => {
    expect(extractLocaleSegment('/us/creators/jane-doe')).toEqual({
      country: 'us',
      rest: '/creators/jane-doe',
    })
  })

  it('country -> currency mapping covers the supported set with no KES leak', () => {
    // The whole point of the system: international visitors must NOT default
    // to KES. Only KE returns kes; everyone else returns their own.
    expect(currencyForCountry('us')).toBe('usd')
    expect(currencyForCountry('ke')).toBe('kes')
    expect(currencyForCountry('gb')).toBe('gbp')
    expect(currencyForCountry('ng')).toBe('ngn')
    expect(currencyForCountry('gh')).toBe('ghs')
    expect(currencyForCountry('za')).toBe('zar')
    expect(currencyForCountry('de')).toBe('eur')
    expect(currencyForCountry('fr')).toBe('eur')
    // Unknown country defaults to USD, NEVER KES (the original revenue bug).
    expect(currencyForCountry('xx')).toBe('usd')
    expect(currencyForCountry('')).toBe('usd')
    expect(currencyForCountry(null)).toBe('usd')
  })
})
