import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProductPrice } from '../ProductPrice'
import { schemas } from '@/lib/api'

describe('ProductPrice', () => {
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

  describe('Multi-price currency matching', () => {
    it('should display price matching selected currency (KES)', () => {
      render(<ProductPrice product={mockProduct} currency="kes" />)

      // Should display formatted KES price
      const priceElement = screen.getByText(/1[,\s]?200/)
      expect(priceElement).toBeInTheDocument()
    })

    it('should display price matching selected currency (USD)', () => {
      render(<ProductPrice product={mockProduct} currency="usd" />)

      // Should display formatted USD price
      const priceElement = screen.getByText(/15/)
      expect(priceElement).toBeInTheDocument()
    })

    it('should display price matching selected currency (JPY - zero-decimal)', () => {
      render(<ProductPrice product={mockProduct} currency="jpy" />)

      // Should display formatted JPY price (not divided by 100)
      const priceElement = screen.getByText(/12[,\s]?300/)
      expect(priceElement).toBeInTheDocument()
    })

    it('should be case-insensitive for currency matching', () => {
      render(<ProductPrice product={mockProduct} currency="KES" />)

      const priceElement = screen.getByText(/1[,\s]?200/)
      expect(priceElement).toBeInTheDocument()
    })
  })

  describe('Fallback handling', () => {
    it('should show fallback price when selected currency not available', () => {
      render(<ProductPrice product={mockProduct} currency="eur" />)

      // Should fallback to KES (default)
      expect(screen.getByText(/1[,\s]?200/)).toBeInTheDocument()
      expect(screen.getByText(/Price shown in KES/i)).toBeInTheDocument()
    })

    it('should show "Price not available" when showFallback is false and currency not found', () => {
      render(
        <ProductPrice
          product={mockProduct}
          currency="eur"
          showFallback={false}
        />,
      )

      expect(screen.getByText(/Price not available/i)).toBeInTheDocument()
    })

    it('should show "Price not available" for product with no prices', () => {
      const emptyProduct = { ...mockProduct, prices: [] }
      render(<ProductPrice product={emptyProduct} currency="kes" />)

      expect(screen.getByText(/Price not available/i)).toBeInTheDocument()
    })
  })

  describe('Currency formatting', () => {
    it('should divide by 100 for decimal currencies (KES)', () => {
      render(<ProductPrice product={mockProduct} currency="kes" />)

      // 120000 cents should display as 1,200
      expect(screen.getByText(/1[,\s]?200/)).toBeInTheDocument()
    })

    it('should divide by 100 for decimal currencies (USD)', () => {
      render(<ProductPrice product={mockProduct} currency="usd" />)

      // 1500 cents should display as 15
      expect(screen.getByText(/15/)).toBeInTheDocument()
    })

    it('should divide by 1 for zero-decimal currencies (JPY)', () => {
      render(<ProductPrice product={mockProduct} currency="jpy" />)

      // 12300 should display as 12,300 (NOT 123)
      expect(screen.getByText(/12[,\s]?300/)).toBeInTheDocument()
    })
  })

  describe('Typography', () => {
    it('should use title-lg typography for price display', () => {
      const { container } = render(
        <ProductPrice product={mockProduct} currency="kes" />,
      )

      const priceElement = container.querySelector('.text-title-lg')
      expect(priceElement).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(
        <ProductPrice
          product={mockProduct}
          currency="kes"
          className="custom-class"
        />,
      )

      const wrapper = container.querySelector('.custom-class')
      expect(wrapper).toBeInTheDocument()
    })
  })

  describe('Formatting modes', () => {
    it('should support compact mode (default)', () => {
      render(<ProductPrice product={mockProduct} currency="kes" />)

      // Should render without error
      expect(screen.getByText(/1[,\s]?200/)).toBeInTheDocument()
    })

    it('should support standard mode', () => {
      render(<ProductPrice product={mockProduct} currency="kes" mode="standard" />)

      expect(screen.getByText(/1[,\s]?200/)).toBeInTheDocument()
    })

    it('should support accounting mode', () => {
      render(
        <ProductPrice product={mockProduct} currency="kes" mode="accounting" />,
      )

      expect(screen.getByText(/1[,\s]?200/)).toBeInTheDocument()
    })
  })
})
