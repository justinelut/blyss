import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PaystackPaymentInterface from './PaystackPaymentInterface'

// Mock checkout data
const mockCheckout = {
  id: 'test-checkout-id',
  status: 'open' as const,
  payment_processor: 'paystack' as const,
  payment_processor_metadata: {
    authorization_url: 'https://checkout.paystack.com/test123',
  },
  is_payment_form_required: true,
} as any

describe('PaystackPaymentInterface', () => {
  it('renders payment method options', () => {
    render(<PaystackPaymentInterface checkout={mockCheckout} />)

    expect(screen.getByText('Card Payment')).toBeInTheDocument()
    expect(screen.getByText('M-Pesa')).toBeInTheDocument()
    expect(screen.getByText('Bank Transfer')).toBeInTheDocument()
  })

  it('renders payment button when authorization URL is provided', () => {
    render(<PaystackPaymentInterface checkout={mockCheckout} />)

    expect(screen.getByText('Continue to Paystack')).toBeInTheDocument()
  })

  it('calls onPaymentMethodSelect when method is selected', () => {
    const mockOnSelect = vi.fn()
    render(
      <PaystackPaymentInterface
        checkout={mockCheckout}
        onPaymentMethodSelect={mockOnSelect}
      />,
    )

    fireEvent.click(screen.getByText('M-Pesa'))
    expect(mockOnSelect).toHaveBeenCalledWith('mpesa')
  })

  it('shows pending status for open checkout', () => {
    render(<PaystackPaymentInterface checkout={mockCheckout} />)

    expect(screen.getByText(/Payment pending/)).toBeInTheDocument()
  })

  it('shows error status for failed checkout', () => {
    const failedCheckout = {
      ...mockCheckout,
      status: 'failed' as const,
    }

    render(<PaystackPaymentInterface checkout={failedCheckout} />)

    expect(screen.getByText(/Payment failed/)).toBeInTheDocument()
  })

  it('disables interface when disabled prop is true', () => {
    render(<PaystackPaymentInterface checkout={mockCheckout} disabled={true} />)

    const cardButton = screen.getByRole('button', { name: /Card Payment/ })
    expect(cardButton).toBeDisabled()
  })

  it('opens payment URL in new window when payment button is clicked', () => {
    const mockOpen = vi.fn()
    vi.stubGlobal('window', { ...window, open: mockOpen })

    render(<PaystackPaymentInterface checkout={mockCheckout} />)

    fireEvent.click(screen.getByText('Continue to Paystack'))
    expect(mockOpen).toHaveBeenCalledWith(
      'https://checkout.paystack.com/test123',
      '_blank',
      'noopener,noreferrer',
    )
  })
})
