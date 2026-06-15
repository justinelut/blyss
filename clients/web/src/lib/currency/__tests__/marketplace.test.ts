import { describe, expect, it } from 'vitest'
import { schemas } from '@/lib/api'
import {
  findPriceForCurrency,
  formatProductPrice,
  getFallbackPrice,
} from '../marketplace'

describe('Marketplace Currency Utilities', () => {
  const mockProduct: schemas['Product'] = {
    id: 'prod-1',
    name: 'Test Product',
    description: 'A test product',
    is_recurring: false,
    is_archived: false,
    organization_id: 'org-1',
    prices: [
      {
        id: 'price-1',
        created_at: '2024-01-01T00:00:00Z',
        modified_at: null,
        amount_type: 'fixed',
        is_archived: false,
        product_id: 'prod-1',
        price_amount: 120000, // KSh 1,200
        price_currency: 'kes',
        recurring_interval: null,
      } as schemas['ProductPrice'],
      {
        id: 'price-2',
        created_at: '2024-01-01T00:00:00Z',
        modified_at: null,
        amount_type: 'fixed',
        is_archived: false,
        product_id: 'prod-1',
        price_amount: 1500, // $15
        price_currency: 'usd',
        recurring_interval: null,
      } as schemas['ProductPrice'],
      {
        id: 'price-3',
        created_at: '2024-01-01T00:00:00Z',
        modified_at: null,
        amount_type: 'fixed',
        is_archived: false,
        product_id: 'prod-1',
        price_amount: 12300, // ¥12,300 (zero-decimal)
        price_currency: 'jpy',
        recurring_interval: null,
      } as schemas['ProductPrice'],
    ],
    benefits: [],
    medias: [],
    attached_custom_fields: [],
    created_at: '2024-01-01T00:00:00Z',
    modified_at: null,
  }

  describe('findPriceForCurrency', () => {
    it('should find price for matching currency', () => {
      const price = findPriceForCurrency(mockProduct, 'kes')
      expect(price).toBeTruthy()
      expect(price?.price_currency).toBe('kes')
      expect(price?.price_amount).toBe(120000)
    })

    it('should be case-insensitive', () => {
      const price = findPriceForCurrency(mockProduct, 'KES')
      expect(price).toBeTruthy()
      expect(price?.price_currency).toBe('kes')
    })

    it('should return null for non-existent currency', () => {
      const price = findPriceForCurrency(mockProduct, 'eur')
      expect(price).toBeNull()
    })

    it('should return null for product with no prices', () => {
      const emptyProduct = { ...mockProduct, prices: [] }
      const price = findPriceForCurrency(emptyProduct, 'kes')
      expect(price).toBeNull()
    })
  })

  describe('formatProductPrice', () => {
    it('should format KES price correctly (divide by 100)', () => {
      const formatted = formatProductPrice(mockProduct, 'kes')
      expect(formatted).toBeTruthy()
      // Should contain "1,200" or "1200" depending on locale
      expect(formatted).toMatch(/1[,\s]?200/)
    })

    it('should format USD price correctly (divide by 100)', () => {
      const formatted = formatProductPrice(mockProduct, 'usd')
      expect(formatted).toBeTruthy()
      expect(formatted).toContain('15')
    })

    it('should format JPY price correctly (divide by 1 - zero-decimal)', () => {
      const formatted = formatProductPrice(mockProduct, 'jpy')
      expect(formatted).toBeTruthy()
      // Should contain "12,300" or "12300" - NOT divided by 100
      expect(formatted).toMatch(/12[,\s]?300/)
    })

    it('should return null for non-existent currency', () => {
      const formatted = formatProductPrice(mockProduct, 'eur')
      expect(formatted).toBeNull()
    })

    it('should support different formatting modes', () => {
      const compact = formatProductPrice(mockProduct, 'usd', 'compact')
      const standard = formatProductPrice(mockProduct, 'usd', 'standard')
      const accounting = formatProductPrice(mockProduct, 'usd', 'accounting')

      expect(compact).toBeTruthy()
      expect(standard).toBeTruthy()
      expect(accounting).toBeTruthy()
    })
  })

  describe('getFallbackPrice', () => {
    it('should return preferred currency if available', () => {
      const result = getFallbackPrice(mockProduct, 'kes')
      expect(result).toBeTruthy()
      expect(result?.currency).toBe('kes')
      expect(result?.price.price_amount).toBe(120000)
    })

    it('should fallback to USD when preferred currency not available', () => {
      // Was previously asserting "fallback to KES" — that step was
      // dropped because KES is the creator's local currency, not a
      // marketplace-wide fallback. The marketplace contract is
      // (preferred OR USD), period. A buyer with a non-USD non-preferred
      // currency on a product priced [KES, USD] sees USD, NOT KES.
      const result = getFallbackPrice(mockProduct, 'eur')
      expect(result).toBeTruthy()
      expect(result?.currency).toBe('usd')
    })

    it('should fallback to USD for a Nigerian visitor on a [KES, USD] product', () => {
      // The user-visible bug shape: a Nigerian browses a Kenyan creator
      // priced in both KES and USD; should see USD, not KES.
      const result = getFallbackPrice(mockProduct, 'ngn')
      expect(result).toBeTruthy()
      expect(result?.currency).toBe('usd')
    })

    it('should use first available price if no preferred + no USD', () => {
      // When both step 1 (preferred) and step 2 (USD) miss, fall
      // through to the first available price. Single-currency creators
      // and legacy data depend on this.
      const productOnlyJPY = {
        ...mockProduct,
        prices: [mockProduct.prices[2]], // Only JPY price
      }
      const result = getFallbackPrice(productOnlyJPY, 'eur')
      expect(result).toBeTruthy()
      expect(result?.currency).toBe('jpy')
    })

    it('should not double-step when the visitor IS USD', () => {
      // The USD fallback step is skipped when preferredCurrency === 'usd'
      // — step 1 already would have matched if a USD price existed. This
      // test pins that no infinite loop / duplicate work happens.
      const productWithoutUSD = {
        ...mockProduct,
        prices: mockProduct.prices.filter((p) => p.price_currency !== 'usd'),
      }
      const result = getFallbackPrice(productWithoutUSD, 'usd')
      expect(result).toBeTruthy()
      // Falls through to step 3 (first available).
      expect(result?.currency).toBe(productWithoutUSD.prices[0].price_currency)
    })

    it('should return null for product with no prices', () => {
      const emptyProduct = { ...mockProduct, prices: [] }
      const result = getFallbackPrice(emptyProduct, 'kes')
      expect(result).toBeNull()
    })
  })

  describe('Zero-decimal currency handling', () => {
    it('should handle all zero-decimal currencies correctly', () => {
      const zeroDecimalCurrencies = ['jpy', 'krw', 'clp', 'pyg', 'vnd']

      zeroDecimalCurrencies.forEach((currency) => {
        const product = {
          ...mockProduct,
          prices: [
            {
              id: 'price-test',
              price_amount: 12300,
              price_currency: currency,
            } as schemas['ProductPrice'],
          ],
        }

        const formatted = formatProductPrice(product, currency)
        expect(formatted).toBeTruthy()
        // Should NOT be divided by 100, so should contain "12,300" or "12300"
        expect(formatted).toMatch(/12[,\s]?300/)
      })
    })
  })
})
