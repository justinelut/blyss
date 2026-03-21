import{ beforeEach, describe, expect, it } from 'vitest'
import { useCurrencyStore } from '../currencyStore'

describe('currencyStore', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    // Reset the store to initial state
    useCurrencyStore.setState({ currency: 'kes' })
  })

  it('should default to KES currency', () => {
    const { currency } = useCurrencyStore.getState()
    expect(currency).toBe('kes')
  })

  it('should update currency when setCurrency is called', () => {
    const { setCurrency } = useCurrencyStore.getState()

    setCurrency('usd')

    const { currency } = useCurrencyStore.getState()
    expect(currency).toBe('usd')
  })

  it('should persist currency selection to localStorage', () => {
    const { setCurrency } = useCurrencyStore.getState()

    setCurrency('eur')

    // Check localStorage
    const stored = localStorage.getItem('blyss-currency')
    expect(stored).toBeTruthy()

    const parsed = JSON.parse(stored!)
    expect(parsed.state.currency).toBe('eur')
  })

  it('should restore currency from localStorage on initialization', () => {
    // Manually set localStorage
    localStorage.setItem(
      'blyss-currency',
      JSON.stringify({
        state: { currency: 'gbp' },
        version: 0,
      }),
    )

    // Create a new store instance (simulating page reload)
    const store = useCurrencyStore.getState()

    // The store should have loaded the persisted value
    expect(store.currency).toBe('gbp')
  })

  it('should support all currency codes including zero-decimal currencies', () => {
    const { setCurrency } = useCurrencyStore.getState()

    // Test zero-decimal currencies
    const zeroDecimalCurrencies = ['jpy', 'krw', 'clp', 'pyg', 'vnd']

    zeroDecimalCurrencies.forEach((currency) => {
      setCurrency(currency)
      const { currency: currentCurrency } = useCurrencyStore.getState()
      expect(currentCurrency).toBe(currency)
    })
  })
})

