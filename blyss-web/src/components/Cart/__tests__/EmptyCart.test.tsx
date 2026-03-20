import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EmptyCart } from '../EmptyCart'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe('EmptyCart', () => {
  it('displays empty cart message', () => {
    render(<EmptyCart />)

    expect(screen.getByText('Your cart is empty')).toBeInTheDocument()
    expect(
      screen.getByText('Add some products to get started'),
    ).toBeInTheDocument()
  })

  it('displays browse products button', () => {
    render(<EmptyCart />)

    expect(screen.getByText('Browse Products')).toBeInTheDocument()
  })

  it('links to products page', () => {
    render(<EmptyCart />)

    const link = screen.getByText('Browse Products').closest('a')
    expect(link).toHaveAttribute('href', '/products')
  })

  it('displays shopping cart icon', () => {
    const { container } = render(<EmptyCart />)

    const icon = container.querySelector('svg')
    expect(icon).toBeInTheDocument()
  })
})
