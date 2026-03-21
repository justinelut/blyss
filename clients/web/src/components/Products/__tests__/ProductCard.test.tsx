import { useAddToCart } from '@/hooks/queries/cart'
import { schemas } from '@/lib/api'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProductCard } from '../ProductCard'

// Mock the hooks
vi.mock('@/hooks/queries/cart')
vi.mock('next/navigation')

// Mock the child components
vi.mock('../ProductThumbnail', () => ({
  ProductThumbnail: ({ product }: any) => (
    <div data-testid="product-thumbnail">{product.name}</div>
  ),
}))

vi.mock('../ProductPriceLabel', () => ({
  default: ({ product }: any) => (
    <div data-testid="product-price">
      ${product.prices[0]?.price_amount || 0}
    </div>
  ),
}))

describe('ProductCard', () => {
  const mockOrganization: schemas['Organization'] = {
    id: 'org-1',
    name: 'Test Org',
    slug: 'test-org',
    avatar_url: null,
    bio: null,
    company: null,
    blog: null,
    location: null,
    email: null,
    twitter_username: null,
    pledge_minimum_amount: 0,
    pledge_badge_show_amount: false,
    default_upfront_split_to_contributors: null,
    account_id: null,
    created_at: '2024-01-01T00:00:00Z',
    modified_at: null,
    profile_settings: {},
    feature_settings: {},
  }

  const mockOneTimeProduct: schemas['Product'] = {
    id: 'prod-1',
    name: 'One-Time Product',
    description: 'A one-time purchase product',
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
        price_amount: 1000,
        price_currency: 'usd',
        recurring_interval: null,
      } as schemas['ProductPrice'],
    ],
    benefits: [],
    medias: [],
    attached_custom_fields: [],
    created_at: '2024-01-01T00:00:00Z',
    modified_at: null,
  }

  const mockRecurringProduct: schemas['Product'] = {
    id: 'prod-2',
    name: 'Recurring Product',
    description: 'A subscription product',
    is_recurring: true,
    is_archived: false,
    organization_id: 'org-1',
    prices: [
      {
        id: 'price-2',
        created_at: '2024-01-01T00:00:00Z',
        modified_at: null,
        amount_type: 'fixed',
        is_archived: false,
        product_id: 'prod-2',
        price_amount: 2000,
        price_currency: 'usd',
        recurring_interval: 'month',
      } as schemas['ProductPrice'],
    ],
    benefits: [],
    medias: [],
    attached_custom_fields: [],
    created_at: '2024-01-01T00:00:00Z',
    modified_at: null,
  }

  const mockAddToCart = vi.fn()
  const mockPush = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAddToCart as any).mockReturnValue({
      mutate: mockAddToCart,
    })
    ;(useRouter as any).mockReturnValue({
      push: mockPush,
    })
  })

  describe('One-time product', () => {
    it('should display "Add to Cart" button for one-time products', () => {
      render(
        <ProductCard
          product={mockOneTimeProduct}
          organization={mockOrganization}
          currency="usd"
        />,
      )

      const button = screen.getByRole('button', { name: /add to cart/i })
      expect(button).toBeInTheDocument()
    })

    it('should call addToCart when "Add to Cart" button is clicked', async () => {
      render(
        <ProductCard
          product={mockOneTimeProduct}
          organization={mockOrganization}
          currency="usd"
        />,
      )

      const button = screen.getByRole('button', { name: /add to cart/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockAddToCart).toHaveBeenCalledWith(
          { productId: 'prod-1', quantity: 1 },
          expect.objectContaining({
            onSettled: expect.any(Function),
          }),
        )
      })
    })

    it('should show loading state when adding to cart', async () => {
      render(
        <ProductCard
          product={mockOneTimeProduct}
          organization={mockOrganization}
          currency="usd"
        />,
      )

      const button = screen.getByRole('button', { name: /add to cart/i })
      fireEvent.click(button)

      // Button should be disabled during loading
      expect(button).toBeDisabled()
    })
  })

  describe('Recurring product', () => {
    it('should display "Buy Now" button for recurring products', () => {
      render(
        <ProductCard
          product={mockRecurringProduct}
          organization={mockOrganization}
          currency="usd"
        />,
      )

      const button = screen.getByRole('button', { name: /buy now/i })
      expect(button).toBeInTheDocument()
    })

    it('should navigate to checkout when "Buy Now" button is clicked', () => {
      render(
        <ProductCard
          product={mockRecurringProduct}
          organization={mockOrganization}
          currency="usd"
        />,
      )

      const button = screen.getByRole('button', { name: /buy now/i })
      fireEvent.click(button)

      expect(mockPush).toHaveBeenCalledWith('/checkout/prod-2')
    })

    it('should not call addToCart for recurring products', () => {
      render(
        <ProductCard
          product={mockRecurringProduct}
          organization={mockOrganization}
          currency="usd"
        />,
      )

      const button = screen.getByRole('button', { name: /buy now/i })
      fireEvent.click(button)

      expect(mockAddToCart).not.toHaveBeenCalled()
    })
  })

  describe('Product display', () => {
    it('should display product name', () => {
      render(
        <ProductCard
          product={mockOneTimeProduct}
          organization={mockOrganization}
          currency="usd"
        />,
      )

      expect(screen.getByText('One-Time Product')).toBeInTheDocument()
    })

    it('should display product description', () => {
      render(
        <ProductCard
          product={mockOneTimeProduct}
          organization={mockOrganization}
          currency="usd"
        />,
      )

      expect(
        screen.getByText('A one-time purchase product'),
      ).toBeInTheDocument()
    })

    it('should render ProductThumbnail component', () => {
      render(
        <ProductCard
          product={mockOneTimeProduct}
          organization={mockOrganization}
          currency="usd"
        />,
      )

      expect(screen.getByTestId('product-thumbnail')).toBeInTheDocument()
    })

    it('should render ProductPriceLabel component', () => {
      render(
        <ProductCard
          product={mockOneTimeProduct}
          organization={mockOrganization}
          currency="usd"
        />,
      )

      expect(screen.getByTestId('product-price')).toBeInTheDocument()
    })
  })
})
