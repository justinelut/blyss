import { schemas } from '@polar-sh/client'
import { fireEvent, render, screen } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CreatorCard } from '../CreatorCard'

vi.mock('next/navigation')

vi.mock('@polar-sh/ui/components/atoms/Avatar', () => ({
  default: ({ name, avatar_url }: any) => (
    <div data-testid="avatar" data-name={name} data-avatar-url={avatar_url}>
      {name}
    </div>
  ),
}))

describe('CreatorCard', () => {
  const mockPush = vi.fn()

  const mockCreator: schemas['CreatorSummarySchema'] = {
    id: 'creator-1',
    name: 'Test Creator',
    slug: 'test-creator',
    avatar_url: 'https://example.com/avatar.jpg',
    product_count: 5,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as any).mockReturnValue({
      push: mockPush,
    })
  })

  it('should render creator name', () => {
    render(<CreatorCard creator={mockCreator} />)

    expect(screen.getByText('Test Creator')).toBeInTheDocument()
  })

  it('should render product count with plural text', () => {
    render(<CreatorCard creator={mockCreator} />)

    expect(screen.getByText('5 products')).toBeInTheDocument()
  })

  it('should render singular "product" for count of 1', () => {
    const singleProductCreator: schemas['CreatorSummarySchema'] = {
      ...mockCreator,
      product_count: 1,
    }

    render(<CreatorCard creator={singleProductCreator} />)

    expect(screen.getByText('1 product')).toBeInTheDocument()
  })

  it('should render Avatar component with correct props', () => {
    render(<CreatorCard creator={mockCreator} />)

    const avatar = screen.getByTestId('avatar')
    expect(avatar).toBeInTheDocument()
    expect(avatar).toHaveAttribute('data-name', 'Test Creator')
    expect(avatar).toHaveAttribute(
      'data-avatar-url',
      'https://example.com/avatar.jpg',
    )
  })

  it('should navigate to creator storefront on click', () => {
    render(<CreatorCard creator={mockCreator} />)

    const card = screen.getByText('Test Creator').closest('div')
    if (card) {
      fireEvent.click(card)
    }

    expect(mockPush).toHaveBeenCalledWith('/creator/test-creator')
  })

  it('should have hover effect classes', () => {
    render(<CreatorCard creator={mockCreator} />)

    const card = screen.getByText('Test Creator').closest('div')
    expect(card).toHaveClass('hover:shadow-lg')
    expect(card).toHaveClass('cursor-pointer')
  })

  it('should handle null avatar_url', () => {
    const creatorWithoutAvatar: schemas['CreatorSummarySchema'] = {
      ...mockCreator,
      avatar_url: null,
    }

    render(<CreatorCard creator={creatorWithoutAvatar} />)

    const avatar = screen.getByTestId('avatar')
    expect(avatar).toHaveAttribute('data-avatar-url', 'null')
  })
})
