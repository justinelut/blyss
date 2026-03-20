import { render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import CheckoutForm from './CheckoutForm'

// Mock the form hook
vi.mock('react-hook-form', () => ({
  useForm: vi.fn(),
}))

// Mock the UI components
vi.mock('@/components/atoms/Button', () => ({
  default: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('@/components/atoms/Input', () => ({
  default: (props: any) => <input {...props} />,
}))

vi.mock('@/components/ui/form', () => ({
  Form: ({ children }: any) => <form>{children}</form>,
  FormControl: ({ children }: any) => <div>{children}</div>,
  FormField: ({ render }: any) =>
    render({ field: { value: '', onChange: vi.fn() } }),
  FormItem: ({ children }: any) => <div>{children}</div>,
  FormLabel: ({ children }: any) => <label>{children}</label>,
  FormMessage: () => <div />,
}))

// Mock translations
vi.mock('@polar-sh/i18n', () => ({
  useTranslations: () => (key: string) => key,
}))

const mockForm = {
  control: {},
  handleSubmit: vi.fn((fn) => (e: any) => {
    e.preventDefault()
    fn({})
  }),
  watch: vi.fn(() => ({})),
  clearErrors: vi.fn(),
  resetField: vi.fn(),
  setValue: vi.fn(),
  formState: { errors: {} },
}

// Mock checkout data for Paystack
const mockPaystackCheckout = {
  id: 'test-checkout-id',
  status: 'open' as const,
  payment_processor: 'paystack' as const,
  payment_processor_metadata: {
    authorization_url: 'https://checkout.paystack.com/test123',
  },
  is_payment_form_required: true,
  is_payment_required: true,
  customer_id: null,
  customer_email: null,
  customer_name: null,
  customer_billing_address: null,
  billing_address_fields: {
    line1: 'optional',
    line2: 'optional',
    city: 'optional',
    state: 'optional',
    postal_code: 'optional',
    country: 'optional',
  },
  require_billing_address: false,
  is_business_customer: false,
  attached_custom_fields: [],
  discount: null,
  customer_tax_id: null,
  active_trial_interval: null,
  total_amount: 1000,
  currency: 'KES',
} as any

describe('CheckoutForm with Paystack', () => {
  beforeEach(() => {
    vi.mocked(useForm).mockReturnValue(mockForm as any)
  })

  it('renders PaystackCheckoutForm for paystack payment processor', () => {
    const mockProps = {
      form: mockForm as any,
      checkout: mockPaystackCheckout,
      update: vi.fn(),
      confirm: vi.fn(),
      loading: false,
      loadingLabel: undefined,
      themePreset: { stripe: {} } as any,
    }

    render(<CheckoutForm {...mockProps} />)

    // Should render the Paystack payment interface
    expect(screen.getByText('Choose Payment Method')).toBeInTheDocument()
    expect(screen.getByText('Card Payment')).toBeInTheDocument()
    expect(screen.getByText('M-Pesa')).toBeInTheDocument()
    expect(screen.getByText('Bank Transfer')).toBeInTheDocument()
    expect(screen.getByText('Continue to Paystack')).toBeInTheDocument()
  })

  it('shows payment pending status for open Paystack checkout', () => {
    const mockProps = {
      form: mockForm as any,
      checkout: mockPaystackCheckout,
      update: vi.fn(),
      confirm: vi.fn(),
      loading: false,
      loadingLabel: undefined,
      themePreset: { stripe: {} } as any,
    }

    render(<CheckoutForm {...mockProps} />)

    expect(screen.getByText(/Payment pending/)).toBeInTheDocument()
  })

  it('renders email field for Paystack checkout', () => {
    const mockProps = {
      form: mockForm as any,
      checkout: mockPaystackCheckout,
      update: vi.fn(),
      confirm: vi.fn(),
      loading: false,
      loadingLabel: undefined,
      themePreset: { stripe: {} } as any,
    }

    render(<CheckoutForm {...mockProps} />)

    expect(screen.getByText('checkout.form.email')).toBeInTheDocument()
  })
})
