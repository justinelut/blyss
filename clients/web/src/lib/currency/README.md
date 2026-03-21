# Multi-Currency System

This directory contains the multi-currency system implementation for the Blyss Marketplace.

## Overview

The multi-currency system supports 37 currencies with Kenya Shillings (KES) as the default. It handles:

- Currency formatting with proper decimal factors
- Zero-decimal currencies (JPY, KRW, CLP, PYG, VND)
- Multi-price currency matching
- Fallback handling for missing currencies
- localStorage persistence of currency selection

## Architecture

### Core Utilities (`index.ts`)

The base currency formatting utilities:

- `getCurrencyDecimalFactor(currency)` - Returns 100 for most currencies, 1 for zero-decimal
- `isDecimalCurrency(currency)` - Checks if currency uses 100 as decimal factor
- `formatCurrency(mode)(cents, currency)` - Formats currency amounts with various modes

**Formatting Modes:**

- `compact` - User-friendly display with narrow symbols, hides unnecessary decimals
- `standard` - Standard display with disambiguated symbols
- `accounting` - Formal display, always shows decimals
- `statistics` - Compact display for charts (K, M, B abbreviations)
- `subcent` - High-precision display for very small amounts

### Marketplace Utilities (`marketplace.ts`)

Marketplace-specific utilities for multi-price products:

- `findPriceForCurrency(product, currency)` - Finds matching price for currency
- `formatProductPrice(product, currency, mode)` - Formats product price in selected currency
- `getFallbackPrice(product, preferredCurrency)` - Gets fallback price when preferred currency unavailable

**Fallback Order:**
1. Preferred currency
2. KES (default)
3. USD (common fallback)
4. First available price

## Components

### ProductPrice Component

React component for displaying product prices with automatic currency matching:

```tsx
import { ProductPrice } from '@/components/Marketplace'

<ProductPrice
  product={product}
  currency="kes"
  mode="compact"
  showFallback={true}
/>
```

**Props:**
- `product` - Product with multiple price points
- `currency` - Selected currency code
- `mode` - Formatting mode (default: 'compact')
- `showFallback` - Show fallback price if selected currency unavailable (default: true)
- `className` - Additional CSS classes

**Features:**
- Displays price in selected currency
- Uses title-lg typography for emphasis
- Shows fallback indicator when using different currency
- Handles missing prices gracefully

### CurrencySelector Component

Dropdown for selecting currency (already exists at `@/components/CurrencySelector`):

```tsx
import { CurrencySelector } from '@/components/CurrencySelector'

<CurrencySelector
  value={currency}
  onChange={setCurrency}
  placeholder="Select currency"
/>
```

**Features:**
- Supports all 37 currencies
- Pinned currencies: KES, USD, EUR, GBP
- Searchable dropdown
- Integrates with currency store for persistence

## State Management

### Currency Store (`@/stores/currencyStore`)

Zustand store with localStorage persistence:

```tsx
import { useCurrencyStore } from '@/stores/currencyStore'

const currency = useCurrencyStore((state) => state.currency)
const setCurrency = useCurrencyStore((state) => state.setCurrency)
```

### useCurrency Hook

Convenience hook for currency management:

```tsx
import { useCurrency } from '@/hooks/useCurrency'

const { currency, setCurrency } = useCurrency()
```

## Supported Currencies

### Decimal Currencies (37 total, divide by 100)

Most currencies including:
- KES (Kenya Shillings) - Default
- USD (US Dollar)
- EUR (Euro)
- GBP (British Pound)
- AUD, BRL, CAD, CHF, CNY, COP, CZK, DKK, HKD, HUF, IDR, ILS, INR, MXN, MYR, NOK, NZD, PEN, PHP, PLN, RON, SAR, SEK, SGD, THB, TRY, TWD, ZAR

### Zero-Decimal Currencies (divide by 1)

Currencies with no fractional units:
- JPY (Japanese Yen)
- KRW (Korean Won)
- CLP (Chilean Peso)
- PYG (Paraguayan Guarani)
- VND (Vietnamese Dong)
- BIF, DJF, GNF, KMF, MGA, RWF, UGX, VUV, XAF, XOF, XPF

## Usage Examples

### Basic Price Display

```tsx
import { ProductPrice } from '@/components/Marketplace'
import { useCurrency } from '@/hooks/useCurrency'

function ProductCard({ product }) {
  const { currency } = useCurrency()

  return (
    <div>
      <h3>{product.name}</h3>
      <ProductPrice product={product} currency={currency} />
    </div>
  )
}
```

### Currency Selection

```tsx
import { CurrencySelector } from '@/components/CurrencySelector'
import { useCurrency } from '@/hooks/useCurrency'

function Header() {
  const { currency, setCurrency } = useCurrency()

  return (
    <header>
      <CurrencySelector value={currency} onChange={setCurrency} />
    </header>
  )
}
```

### Manual Price Formatting

```tsx
import { formatProductPrice } from '@/lib/currency/marketplace'

const product = {
  prices: [
    { price_amount: 120000, price_currency: 'kes' },
    { price_amount: 1500, price_currency: 'usd' }
  ]
}

const kesPrice = formatProductPrice(product, 'kes') // "KSh 1,200"
const usdPrice = formatProductPrice(product, 'usd') // "$15"
const eurPrice = formatProductPrice(product, 'eur') // null (not available)
```

### Fallback Handling

```tsx
import { getFallbackPrice } from '@/lib/currency/marketplace'

const fallback = getFallbackPrice(product, 'eur')
if (fallback) {
  console.log(`Showing price in ${fallback.currency}`)
  // Fallback order: EUR → KES → USD → first available
}
```

## Testing

Tests are located in `__tests__` directories:

- `index.test.ts` - Core currency formatting tests
- `marketplace.test.ts` - Marketplace utilities tests
- `ProductPrice.test.tsx` - Component tests

Run tests:
```bash
pnpm test marketplace.test.ts
```

## Requirements Mapping

This implementation satisfies the following requirements from the spec:

- **2.1** - Display prices using Price_Amount and Presentment_Currency
- **2.2** - Support all 37 currencies from PresentmentCurrency enum
- **2.3** - Default to KES as primary currency
- **2.4** - Provide currency selector in header/settings
- **2.5** - Persist currency selection across sessions
- **2.6** - Format amounts dividing by 100 for most, by 1 for zero-decimal
- **2.7** - Display currency symbol with amount
- **2.8** - Display price matching selected currency from product.prices array
- **2.9** - Show fallback message if product lacks price for selected currency
- **2.10** - Use title-lg typography for price display

## Design Patterns

### Curried Formatting

The `formatCurrency` function uses currying for flexibility:

```tsx
// Create a formatter once
const formatCompact = formatCurrency('compact')

// Use it multiple times
formatCompact(1500, 'usd')  // "$15"
formatCompact(120000, 'kes') // "KSh 1,200"
```

### Memoization

Components use `useMemo` to avoid recalculating prices:

```tsx
const priceInfo = useMemo(() => {
  return findPriceForCurrency(product, currency)
}, [product.prices, currency])
```

### Type Safety

All functions use TypeScript schemas from `@/lib/api`:

```tsx
import { schemas } from '@/lib/api'

function formatPrice(product: schemas['Product'], currency: string) {
  // Type-safe access to product.prices
}
```

## Performance Considerations

1. **Memoization** - Price calculations are memoized to avoid recalculation
2. **Lazy Loading** - Currency selector loads currency list on demand
3. **localStorage** - Currency preference cached locally, no API calls needed
4. **Intl.NumberFormat** - Uses native browser formatting for performance

## Accessibility

- Currency symbols are included in formatted strings for screen readers
- Fallback messages clearly indicate when alternative currency is shown
- All interactive elements (CurrencySelector) are keyboard accessible

## Future Enhancements

Potential improvements:

1. **Currency Conversion** - Convert prices between currencies using exchange rates
2. **Regional Formatting** - Respect user's locale for number formatting
3. **Price History** - Track price changes over time
4. **Bulk Operations** - Format multiple prices at once for performance
5. **Custom Symbols** - Allow custom currency symbols for branding
