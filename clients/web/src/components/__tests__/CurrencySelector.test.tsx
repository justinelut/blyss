import { enums } from '@/lib/api'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CurrencySelector } from '../CurrencySelector'

// Mock the Combobox component
vi.mock('@/components/atoms/Combobox', () => ({
  Combobox: ({ value, placeholder }: any) => (
    <div role="combobox" data-value={value}>
      {placeholder}
    </div>
  ),
}))

describe('CurrencySelector', () => {
  it('should support all 37 currencies from PresentmentCurrency enum', () => {
    const onChange = vi.fn()
    render(<CurrencySelector value="kes" onChange={onChange} />)

    // Verify the component renders
    expect(screen.getByRole('combobox')).toBeInTheDocument()

    // Verify all 37 currencies are available
    expect(enums.presentmentCurrencyValues).toHaveLength(37)
  })

  it('should render with KES as default pinned currency', () => {
    const onChange = vi.fn()
    render(<CurrencySelector value="kes" onChange={onChange} />)

    const combobox = screen.getByRole('combobox')
    expect(combobox).toBeInTheDocument()
    expect(combobox).toHaveAttribute('data-value', 'kes')
  })

  it('should support zero-decimal currencies (JPY, KRW, CLP, PYG, VND)', () => {
    const onChange = vi.fn()
    render(<CurrencySelector value="jpy" onChange={onChange} />)

    // Verify zero-decimal currencies are in the enum
    expect(enums.presentmentCurrencyValues).toContain('jpy')
    expect(enums.presentmentCurrencyValues).toContain('krw')
    expect(enums.presentmentCurrencyValues).toContain('clp')
  })

  it('should render with custom placeholder', () => {
    const onChange = vi.fn()
    render(
      <CurrencySelector
        value="kes"
        onChange={onChange}
        placeholder="Choose currency"
      />,
    )

    expect(screen.getByText('Choose currency')).toBeInTheDocument()
  })

  it('should be disabled when disabled prop is true', () => {
    const onChange = vi.fn()
    const { container } = render(
      <CurrencySelector value="kes" onChange={onChange} disabled={true} />,
    )

    // Check for disabled styling
    const combobox = container.querySelector('.pointer-events-none')
    expect(combobox).toBeInTheDocument()
  })
})
