import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CartPage } from '../CartPage'

vi.mock('@/hooks/queries/cart', () => ({
  useCart: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

vi.mock('@polar-sh/currency', () => ({
  formatCurrency: (amount: number, currency: string) =>
    `$${(amount / 100).toFixed(2)}`,
}))

vi.mock('../CartItem', () => ({
  CartItem: ({ item }: any) => <div data-testid={`cart-item-${item.id}`}>{item.product.name}</div>,
}))

vi.mock('../EmptyCart', () => ({
  EmptyCart: () => <div data-testid="empty-cart">Empty Cart</div>,
}))

vi.mock('@/components/Shared/Spinner', () => ({
  default: () => <div data-testid="spinner">Loading...</div>,
}))

import { useCart } from '@/hooks/queries/cart'
import { useRouter } from 'next/navigation'

describe('CartPage', () => {
  const mockRouter = {
    push: vi.fn(),
  }

  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue(mockRouter as any)
  })

  it('displays loading spinner when loading', () => {
    vi.mocked(useCart).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any)

    render(<CartPage />)

    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  it('displays error message when there is an error', () => {
    vi.mocked(useCart).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to load'),
    } as any)

    render(<CartPage />)

    expect(screen.getByText('Failed to load cart. Please try again.')).toBeInTheDocument()
  })

  it('displays empty cart when cart has no items', () => {
    vi.mocked(useCart).mockReturnValue({
      data: { items: [], item_count: 0, subtotal: 0, tax: 0, total: 0 },
      isLoading: false,
      error: null,
    } as any)

    render(<CartPage />)

    expect(screen.getByTestId('empty-cart')).toBeInTheDocument()
  })

  it('displays all cart items', () => {
    const mockCart = {
      items: [
        {
          id: 'item_1',
          product: {
            id: 'prod_1',
            name: 'Product 1',
            prices: [{ price_amount: 1000, price_currency: 'usd' }],
          },
          quantity: 1,
          subtotal: 1000,
        },
        {
          id: 'item_2',
          product: {
            id: 'prod_2',
            name: 'Product 2',
            prices: [{ price_amount: 2000, price_currency: 'usd' }],
          },
          quantity: 2,
          subtotal: 4000,
        },
      ],
      item_count: 3,
      subtotal: 5000,
      tax: 500,
      total: 5500,
    }

    vi.mocked(useCart).mockReturnValue({
      data: mockCart,
      isLoading: false,
      error: null,
    } as any)

    render(<CartPage />)

    expect(screen.getByTestId('cart-item-item_1')).toBeInTheDocument()
    expect(screen.getByTestId('cart-item-item_2')).toBeInTheDocument()
  })

  it('displays subtotal, tax, and total', () => {
    const mockCart = {
      items: [
        {
          id: 'item_1',
          product: {
            id: 'prod_1',
            name: 'Product 1',
            prices: [{ price_amount: 1000, price_currency: 'usd' }],
          },
          quantity: 1,
          subtotal: 1000,
        },
      ],
      item_count: 1,
      subtotal: 1000,
      tax: 100,
      total: 1100,
    }

    vi.mocked(useCart).mockReturnValue({
      data: mockCart,
      isLoading: false,
      error: null,
    } as any)

    render(<CartPage />)

    expect(screen.getByText('Subtotal')).toBeInTheDocument()
    expect(screen.getByText('$10.00')).toBeInTheDocument()
    expect(screen.getByText('Estimated Tax')).toBeInTheDocument()
    expect(screen.getByText('$1.00')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('$11.00')).toBeInTheDocument()
  })

  it('displays proceed to checkout button', () => {
    const mockCart = {
      items: [
        {
          id: 'item_1',
          product: {
            id: 'prod_1',
            name: 'Product 1',
            prices: [{ price_amount: 1000, price_currency: 'usd' }],
          },
          quantity: 1,
          subtotal: 1000,
        },
      ],
      item_count: 1,
      subtotal: 1000,
      tax: 100,
      total: 1100,
    }

    vi.mocked(useCart).mockReturnValue({
      data: mockCart,
      isLoading: false,
      error: null,
    } as any)

    render(<CartPage />)

    expect(screen.getByText('Proceed to Checkout')).toBeInTheDocument()
  })

  it('navigates to checkout when button is clicked', () => {
    const mockCart = {
      items: [
        {
          id: 'item_1',
          product: {
            id: 'prod_1',
            name: 'Product 1',
            prices: [{ price_amount: 1000, price_currency: 'usd' }],
          },
          quantity: 1,
          subtotal: 1000,
        },
      ],
      item_count: 1,
      subtotal: 1000,
      tax: 100,
      total: 1100,
    }

    vi.mocked(useCart).mockReturnValue({
      data: mockCart,
      isLoading: false,
      error: null,
    } as any)

    render(<CartPage />)

    const checkoutButton = screen.getByText('Proceed to Checkout')
    fireEvent.click(checkoutButton)

    expect(mockRouter.push).toHaveBeenCalledWith('/checkout')
  })

  it('displays shopping cart heading', () => {
    const mockCart = {
      items: [
        {
          id: 'item_1',
          product: {
            id: 'prod_1',
            name: 'Product 1',
            prices: [{ price_amount: 1000, price_currency: 'usd' }],
          },
          quantity: 1,
          subtotal: 1000,
        },
      ],
      item_count: 1,
      subtotal: 1000,
      tax: 100,
      total: 1100,
    }

    vi.mocked(useCart).mockReturnValue({
      data: mockCart,
      isLoading: false,
      error: null,
    } as any)

    render(<CartPage />)

    expect(screen.getByText('Shopping Cart')).toBeInTheDocument()
  })
})
