import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { CartPage } from '../CartPage'

vi.mock('@/hooks/queries/cart', () => ({
  useCartGrouped: vi.fn(),
  useCheckoutCartForOrganization: vi.fn(),
  useRemoveFromCart: vi.fn(() => ({ mutate: vi.fn(), variables: undefined })),
}))

vi.mock('@/hooks/queries/wishlist', () => ({
  useAddToWishlist: vi.fn(() => ({
    mutate: vi.fn(),
    variables: undefined,
    isPending: false,
  })),
}))

vi.mock('@/hooks/auth', () => ({
  useAuth: () => ({ authenticated: true }),
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

vi.mock('../CartItemRow', () => ({
  CartItemRow: ({ item }: any) => (
    <div data-testid={`cart-item-${item.id}`}>
      {item.product?.name ?? 'Unknown'}
    </div>
  ),
}))

vi.mock('../EmptyCart', () => ({
  EmptyCart: () => <div data-testid="empty-cart">Empty Cart</div>,
}))

vi.mock('@/components/Shared/Spinner', () => ({
  default: () => <div data-testid="spinner">Loading...</div>,
}))

vi.mock('@/components/atoms/Avatar', () => ({
  default: ({ name }: any) => <div data-testid="avatar">{name}</div>,
}))

vi.mock('@/components/Shared/ErrorState', () => ({
  ErrorState: ({ title }: any) => <div data-testid="error-state">{title}</div>,
}))

import {
  useCartGrouped,
  useCheckoutCartForOrganization,
} from '@/hooks/queries/cart'
import { useRouter } from 'next/navigation'

describe('CartPage', () => {
  const mockRouter = { push: vi.fn() }
  const mockCheckoutMutate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRouter).mockReturnValue(mockRouter as any)
    vi.mocked(useCheckoutCartForOrganization).mockReturnValue({
      mutate: mockCheckoutMutate,
      isPending: false,
      variables: undefined,
    } as any)
  })

  it('shows spinner when loading', () => {
    vi.mocked(useCartGrouped).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any)
    render(<CartPage />)
    expect(screen.getByTestId('spinner')).toBeTruthy()
  })

  it('shows error state when fetch fails', () => {
    vi.mocked(useCartGrouped).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('boom'),
      refetch: vi.fn(),
    } as any)
    render(<CartPage />)
    expect(screen.getByTestId('error-state')).toBeTruthy()
  })

  it('shows empty cart when no creators have items', () => {
    vi.mocked(useCartGrouped).mockReturnValue({
      data: { groups: [], item_count: 0 },
      isLoading: false,
      error: null,
    } as any)
    render(<CartPage />)
    expect(screen.getByTestId('empty-cart')).toBeTruthy()
  })

  it('renders one section per creator with their items', () => {
    vi.mocked(useCartGrouped).mockReturnValue({
      data: {
        groups: [
          {
            organization: {
              id: 'org-a',
              slug: 'creator-a',
              name: 'Creator A',
              avatar_url: null,
            },
            items: [
              {
                id: 'item-1',
                product: { name: 'Product One', prices: [{ price_currency: 'KES' }] },
                quantity: 1,
                subtotal: 5000,
              },
            ],
            subtotal: 5000,
            tax: 0,
            total: 5000,
            item_count: 1,
          },
          {
            organization: {
              id: 'org-b',
              slug: 'creator-b',
              name: 'Creator B',
              avatar_url: null,
            },
            items: [
              {
                id: 'item-2',
                product: { name: 'Product Two', prices: [{ price_currency: 'KES' }] },
                quantity: 1,
                subtotal: 8000,
              },
            ],
            subtotal: 8000,
            tax: 0,
            total: 8000,
            item_count: 1,
          },
        ],
        item_count: 2,
      },
      isLoading: false,
      error: null,
    } as any)
    render(<CartPage />)
    expect(screen.getAllByText('Creator A').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Creator B').length).toBeGreaterThan(0)
    expect(screen.getByTestId('cart-item-item-1')).toBeTruthy()
    expect(screen.getByTestId('cart-item-item-2')).toBeTruthy()
  })

  it('renders a Pay button per creator and calls scoped checkout', () => {
    vi.mocked(useCartGrouped).mockReturnValue({
      data: {
        groups: [
          {
            organization: {
              id: 'org-x',
              slug: 'creator-x',
              name: 'Creator X',
              avatar_url: null,
            },
            items: [
              {
                id: 'item-x',
                product: { name: 'X Product', prices: [{ price_currency: 'KES' }] },
                quantity: 1,
                subtotal: 1000,
              },
            ],
            subtotal: 1000,
            tax: 0,
            total: 1000,
            item_count: 1,
          },
        ],
        item_count: 1,
      },
      isLoading: false,
      error: null,
    } as any)
    render(<CartPage />)
    const payButton = screen.getByRole('button', { name: /Pay Creator X/i })
    fireEvent.click(payButton)
    expect(mockCheckoutMutate).toHaveBeenCalledWith(
      'org-x',
      expect.any(Object),
    )
  })
})
