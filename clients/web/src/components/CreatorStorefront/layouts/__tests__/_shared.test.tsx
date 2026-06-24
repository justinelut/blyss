import { describe, test, expect } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import {
  HeroBio,
  HeroStatsLine,
  formatStatCount,
  formatStatMoney,
} from '../_shared'

describe('formatStatCount', () => {
  test('preserves small numbers as-is', () => {
    expect(formatStatCount(0)).toBe('0')
    expect(formatStatCount(7)).toBe('7')
    expect(formatStatCount(999)).toBe('999')
  })
  test('compresses thousands with one decimal', () => {
    expect(formatStatCount(1_000)).toBe('1.0K')
    expect(formatStatCount(12_700)).toBe('12.7K')
  })
  test('compresses millions with one decimal', () => {
    expect(formatStatCount(2_500_000)).toBe('2.5M')
  })
})

describe('formatStatMoney', () => {
  test('treats input as minor units (cents)', () => {
    // 12,700 cents = 127 KSh
    expect(formatStatMoney(12_700)).toBe('KSh 127')
  })
  test('compresses to thousands at 100,000 cents', () => {
    // 100,000 cents = 1,000 KSh -> KSh 1.0K
    expect(formatStatMoney(100_000)).toBe('KSh 1.0K')
  })
  test('compresses to millions when major ≥ 1M', () => {
    // 100,000,000 cents = 1,000,000 KSh -> KSh 1.0M
    expect(formatStatMoney(100_000_000)).toBe('KSh 1.0M')
  })
  test('handles 0 + null-ish inputs gracefully', () => {
    expect(formatStatMoney(0)).toBe('KSh 0')
    expect(formatStatMoney(undefined as unknown as number)).toBe('KSh 0')
  })
})

describe('HeroStatsLine', () => {
  test('renders nothing when all values are zero', () => {
    const { container } = render(
      <HeroStatsLine productsCount={0} totalOrders={0} totalEarned={0} />,
    )
    expect(container.firstChild).toBeNull()
  })

  test('joins fragments with the dot separator and pluralises products', () => {
    const { getByText } = render(
      <HeroStatsLine
        productsCount={3}
        totalOrders={18}
        totalEarned={1_270_000}
      />,
    )
    expect(getByText('3 products · 18 sold · KSh 12.7K earned')).toBeTruthy()
  })

  test('singular product label when count is 1', () => {
    const { getByText } = render(
      <HeroStatsLine productsCount={1} totalOrders={0} totalEarned={0} />,
    )
    expect(getByText('1 product')).toBeTruthy()
  })

  test('hides each fragment when its value is zero', () => {
    const { getByText, queryByText } = render(
      <HeroStatsLine productsCount={5} totalOrders={0} totalEarned={0} />,
    )
    expect(getByText('5 products')).toBeTruthy()
    expect(queryByText(/sold/)).toBeNull()
    expect(queryByText(/earned/)).toBeNull()
  })
})

describe('HeroBio', () => {
  test('renders nothing when bio is empty', () => {
    const { container } = render(<HeroBio bio="" name="Jane" />)
    expect(container.firstChild).toBeNull()
  })

  test('renders bio inline without Read more when short', () => {
    const short = 'A short bio.'
    const { getByText, queryByRole } = render(
      <HeroBio bio={short} name="Jane" threshold={140} />,
    )
    expect(getByText(short)).toBeTruthy()
    expect(queryByRole('button', { name: 'Read more' })).toBeNull()
  })

  test('shows Read more button when bio exceeds threshold', () => {
    const long = 'a'.repeat(200)
    const { getByRole } = render(
      <HeroBio bio={long} name="Jane" threshold={140} />,
    )
    expect(getByRole('button', { name: 'Read more' })).toBeTruthy()
  })

  test('Read more click opens the BlyssDialog with full bio', () => {
    const long = 'long-text-' + 'x'.repeat(200)
    const { getByRole, queryByRole } = render(
      <HeroBio bio={long} name="Jane Doe" threshold={50} />,
    )
    expect(queryByRole('dialog')).toBeNull()
    fireEvent.click(getByRole('button', { name: 'Read more' }))
    const dialog = getByRole('dialog')
    expect(dialog).toBeTruthy()
    // Full bio inside dialog body
    expect(dialog.textContent).toContain(long)
    // Title is the creator name
    expect(dialog.textContent).toContain('Jane Doe')
  })
})
