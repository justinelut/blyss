import { schemas } from '@polar-sh/client'
import { render, screen } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TabContent } from '../TabContent'

vi.mock('next/navigation')
vi.mock('@/hooks/queries/cart')
vi.mock('@/components/Products/ProductThumbnail')
vi.mock('@/components/Products/ProductPriceLabel')

describe('TabContent', () => {
  const mockPush = vi.fn()

  const mockCreator: schemas['CreatorStorefrontSchema'] = {
    id: 'creator-1',
    name: 'Test Creator',
    slug: 'test-creator',
    avatar_url: 'https://example.com/avatar.jpg',
    bio: 'This is a test bio',
    social_links: {
      twitter: 'https://twitter.com/test',
    },
    products: [
      {
        id: 'product-1',
        name: 'Test Product 1',
        description: 'Product description 1',
        is_recurring: false,
        prices: [],
        medias: [],
        organization: {
          id: 'creator-1',
          name: 'Test Creator',
          slug: 'test-creator',
          avatar_url: 'https://example.com/avatar.jpg',
        },
      } as schemas['ProductPublic'],
      {
        id: 'product-2',
        name: 'Test Product 2',
        description: 'Product description 2',
        is_recurring: true,
        prices: [],
        medias: [],
        organization: {
          id: 'creator-1',
          name: 'Test Creator',
          slug: 'test-creator',
          avatar_url: 'https://example.com/avatar.jpg',
        },
      } as schemas['ProductPublic'],
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as any).mockReturnValue({
      push: mockPush,
    })
  })

  describe('Overview tab', () => {
    it('should render creator bio', () => {
      render(<TabContent creator={mockCreator} activeTab="overview" />)

      expect(screen.getByText('About Test Creator')).toBeInTheDocument()
      expect(screen.getByText('This is a test bio')).toBeInTheDocument()
    })

    it('should render "No description available" when bio is null', () => {
      const creatorWithoutBio = { ...mockCreator, bio: null }
      render(<TabContent creator={creatorWithoutBio} activeTab="overview" />)

      expect(screen.getByText('No description available.')).toBeInTheDocument()
    })

    it('should render "No description available" when bio is empty', () => {
      const creatorWithEmptyBio = { ...mockCreator, bio: '' }
      render(<TabContent creator={creatorWithEmptyBio} activeTab="overview" />)

      expect(screen.getByText('No description available.')).toBeInTheDocument()
    })
  })

  describe('Products tab', () => {
    it('should render products heading', () => {
      render(<TabContent creator={mockCreator} activeTab="products" />)

      expect(screen.getByText('Products')).toBeInTheDocument()
    })

    it('should render product cards when products exist', () => {
      render(<TabContent creator={mockCreator} activeTab="products" />)

      expect(screen.getByText('Test Product 1')).toBeInTheDocument()
      expect(screen.getByText('Test Product 2')).toBeInTheDocument()
    })

    it('should render empty state when no products', () => {
      const creatorWithoutProducts = { ...mockCreator, products: [] }
      render(
        <TabContent creator={creatorWithoutProducts} activeTab="products" />,
      )

      expect(screen.getByText('No products available.')).toBeInTheDocument()
    })

    it('should use grid layout for products', () => {
      const { container } = render(
        <TabContent creator={mockCreator} activeTab="products" />,
      )

      const grid = container.querySelector('.grid')
      expect(grid).toHaveClass('grid-cols-1')
      expect(grid).toHaveClass('sm:grid-cols-2')
      expect(grid).toHaveClass('lg:grid-cols-3')
    })
  })

  describe('Subscriptions tab', () => {
    it('should render subscriptions heading', () => {
      render(<TabContent creator={mockCreator} activeTab="subscriptions" />)

      expect(screen.getByText('Subscriptions')).toBeInTheDocument()
    })

    it('should render coming soon placeholder', () => {
      render(<TabContent creator={mockCreator} activeTab="subscriptions" />)

      expect(screen.getByText('Subscriptions coming soon.')).toBeInTheDocument()
    })
  })

  describe('Invalid tab', () => {
    it('should return null for invalid tab', () => {
      const { container } = render(
        <TabContent creator={mockCreator} activeTab="invalid" />,
      )

      expect(container.firstChild).toBeNull()
    })
  })
})
