import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CartIcon } from '../CartIcon'

vi.mock('@/hooks/queries/cart', () => ({
  useCart: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

import { useCart } from '@/hooks/queries/cart'

describe('CartIcon', () => {
  it('displays cart icon with zero count when cart is empty', () => {
    vi.mocked(useCart).mockReturnValue({
      data: { items: [], item_count: 0, subtotal: 0, tax: 0, total: 0 },
    } as any)

    const { container } = render(<CartIcon />)

    expect(
      screen.getByLabelText('Shopping cart with 0 items'),
    ).toBeInTheDocument()
    expect(container.querySelector('span')).not.toBeInTheDocument()
  })

  it('displays cart icon with item count badge when cart has items', () => {
    vi.mocked(useCart).mockReturnValue({
      data: { items: [], item_count: 3, subtotal: 0, tax: 0, total: 0 },
    } as any)

    render(<CartIcon />)

    expect(
      screen.getByLabelText('Shopping cart with 3 items'),
    ).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('displays 99+ when cart has more than 99 items', () => {
    vi.mocked(useCart).mockReturnValue({
      data: { items: [], item_count: 150, subtotal: 0, tax: 0, total: 0 },
    } as any)

    render(<CartIcon />)

    expect(screen.getByText('99+')).toBeInTheDocument()
  })

  it('links to cart page', () => {
    vi.mocked(useCart).mockReturnValue({
      data: { items: [], item_count: 0, subtotal: 0, tax: 0, total: 0 },
    } as any)

    render(<CartIcon />)

    const link = screen.getByLabelText('Shopping cart with 0 items')
    expect(link).toHaveAttribute('href', '/cart')
  })

  it('handles undefined cart data gracefully', () => {
    vi.mocked(useCart).mockReturnValue({
      data: undefined,
    } as any)

    render(<CartIcon />)

    expect(
      screen.getByLabelText('Shopping cart with 0 items'),
    ).toBeInTheDocument()
  })
})
