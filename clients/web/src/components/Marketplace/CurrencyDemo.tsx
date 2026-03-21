'use client'

import { useCurrency } from '@/hooks/useCurrency'
import { CurrencySelector } from '@/components/CurrencySelector'
import { ProductPrice } from './ProductPrice'
import { schemas } from '@/lib/api'

/**
 * Demo component showing multi-currency system integration
 *
 * This component demonstrates:
 * - Currency selection with CurrencySelector
 * - Automatic price display updates when currency changes
 * - Multi-price currency matching
 * - Fallback handling for missing currencies
 * - localStorage persistence
 *
 * Requirements: 2.1-2.9
 */
export const CurrencyDemo = () => {
  const { currency, setCurrency } = useCurrency()

  // Example product with multiple prices
  const exampleProduct: schemas['Product'] = {
    id: 'demo-1',
    name: 'Savannah Mist Preset',
    description: 'Professional photo preset',
    is_recurring: false,
    is_archived: false,
    organization_id: 'org-1',
    prices: [
      {
        id: 'price-1',
        price_amount: 120000, // KSh 1,200
        price_currency: 'kes',
        created_at: '2024-01-01T00:00:00Z',
        modified_at: null,
        amount_type: 'fixed',
        is_archived: false,
        product_id: 'demo-1',
        recurring_interval: null,
      } as schemas['ProductPrice'],
      {
        id: 'price-2',
        price_amount: 1500, // $15
        price_currency: 'usd',
        created_at: '2024-01-01T00:00:00Z',
        modified_at: null,
        amount_type: 'fixed',
        is_archived: false,
        product_id: 'demo-1',
        recurring_interval: null,
      } as schemas['ProductPrice'],
      {
        id: 'price-3',
        price_amount: 1200, // €12
        price_currency: 'eur',
        created_at: '2024-01-01T00:00:00Z',
        modified_at: null,
        amount_type: 'fixed',
        is_archived: false,
        product_id: 'demo-1',
        recurring_interval: null,
      } as schemas['ProductPrice'],
      {
        id: 'price-4',
        price_amount: 1800, // ¥1,800 (zero-decimal)
        price_currency: 'jpy',
        created_at: '2024-01-01T00:00:00Z',
        modified_at: null,
        amount_type: 'fixed',
        is_archived: false,
        product_id: 'demo-1',
        recurring_interval: null,
      } as schemas['ProductPrice'],
    ],
    benefits: [],
    medias: [],
    attached_custom_fields: [],
    created_at: '2024-01-01T00:00:00Z',
    modified_at: null,
  }

  return (
    <div className="space-y-6 rounded-lg border p-6">
      <div>
        <h3 className="mb-2 text-lg font-semibold">Multi-Currency Demo</h3>
        <p className="text-sm text-muted-foreground">
          Select a currency to see the price update automatically
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Select Currency</label>
        <CurrencySelector
          value={currency}
          onChange={setCurrency}
          placeholder="Choose currency"
        />
      </div>

      <div className="space-y-4 rounded-md bg-surface-container-lowest p-4">
        <div>
          <h4 className="mb-1 font-medium">{exampleProduct.name}</h4>
          <p className="text-sm text-muted-foreground">
            {exampleProduct.description}
          </p>
        </div>

        <ProductPrice product={exampleProduct} currency={currency} />

        <div className="text-xs text-muted-foreground">
          <p>Available prices:</p>
          <ul className="ml-4 mt-1 list-disc">
            <li>KES: KSh 1,200</li>
            <li>USD: $15</li>
            <li>EUR: €12</li>
            <li>JPY: ¥1,800 (zero-decimal currency)</li>
          </ul>
        </div>
      </div>

      <div className="rounded-md bg-blue-50 p-4 text-sm dark:bg-blue-950">
        <p className="font-medium">How it works:</p>
        <ul className="ml-4 mt-2 list-disc space-y-1">
          <li>Currency selection persists across page reloads (localStorage)</li>
          <li>Prices divide by 100 for most currencies (KES, USD, EUR)</li>
          <li>Zero-decimal currencies (JPY, KRW) divide by 1</li>
          <li>Fallback to KES → USD → first available if selected currency not available</li>
        </ul>
      </div>
    </div>
  )
}
