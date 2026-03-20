import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CartItem } from '../CartItem'

vi.mock('@/hooks/queries/cart', () => ({
  useRemoveFromCart: vi.fn(),
}))

vi.mock('@polar-sh/currency', () => ({
  formatCurrency: (amount: number, currency: string) =>
    `$${(amount / 100).toFixed(2)}`,
}))

import { useRemoveFromCart } from '@/hooks/queries/cart'

describe('CartItem', () => {
  const mockItem = {
    id: 'item_1',
    product: {
      id: 'prod_1',
      name: 'Test Product',
      description: 'A test product description',
      prices: [
        {
          price_amount: 1999,
          price_currency: 'usd',
        },
      ],
    },
    quantity: 2,
    subtotal: 3998,
  }

  const mockRemove = vi.fn()

  beforeEach(() => {
    vi.mocked(useRemoveFromCart).mockReturnValue({
      mutate: mockRemove,
      isPending: false,
    } as any)
  })

  it('renders product name and description', () => {
    render(<CartItem item={mockItem} />)

    expect(screen.getByText('Test Product')).toBeInTheDocument()
    expect(screen.getByText('A test product description')).toBeInTheDocument()
  })

  it('displays product price and quantity', () => {
    render(<CartItem item={mockItem} />)

    expect(screen.getByText('$19.99')).toBeInTheDocument()
    expect(screen.getByText('Quantity: 2')).toBeInTheDocument()
  })

  it('displays subtotal', () => {
    render(<CartItem item={mockItem} />)

    expect(screen.getByText('$39.98')).toBeInTheDocument()
  })

  it('shows remove button', () => {
    render(<CartItem item={mockItem} />)

    expect(screen.getByText('Remove')).toBeInTheDocument()
  })

  it('shows confirmation buttons when remove is clicked', () => {
    render(<CartItem item={mockItem} />)

    const removeButton = screen.getByText('Remove')
    fireEvent.click(removeButton)

    expect(screen.getByText('Confirm')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('calls removeItem when confirm is clicked', async () => {
    render(<CartItem item={mockItem} />)

    const removeButton = screen.getByText('Remove')
    fireEvent.click(removeButton)

    const confirmButton = screen.getByText('Confirm')
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockRemove).toHaveBeenCalledWith({ itemId: 'item_1' })
    })
  })

  it('hides confirmation buttons when cancel is clicked', () => {
    render(<CartItem item={mockItem} />)

    const removeButton = screen.getByText('Remove')
    fireEvent.click(removeButton)

    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    expect(screen.queryByText('Confirm')).not.toBeInTheDocument()
    expect(screen.getByText('Remove')).toBeInTheDocument()
  })

  it('disables buttons when removal is pending', () => {
    vi.mocked(useRemoveFromCart).mockReturnValue({
      mutate: mockRemove,
      isPending: true,
    } as any)

    render(<CartItem item={mockItem} />)

    const removeButton = screen.getByText('Remove')
    fireEvent.click(removeButton)

    const confirmButton = screen.getByText('Confirm')
    const cancelButton = screen.getByText('Cancel')

    expect(confirmButton).toBeDisabled()
    expect(cancelButton).toBeDisabled()
  })

  it('handles product without description', () => {
    const itemWithoutDescription = {
      ...mockItem,
      product: {
        ...mockItem.product,
        description: undefined,
      },
    }

    render(<CartItem item={itemWithoutDescription} />)

    expect(screen.getByText('Test Product')).toBeInTheDocument()
    expect(
      screen.queryByText('A test product description'),
    ).not.toBeInTheDocument()
  })
})
