import { describe, test, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Button } from '../Button'
import { Input } from '../Input'
import { typography } from '../typography'

/**
 * Core primitive compliance — plan §3.3 (type scale) + §3.4 (buttons/inputs).
 */

describe('Button primitive (§3.4)', () => {
  test('primary uses --accent fill, 8px radius, and no drop shadow', () => {
    const { getByRole } = render(<Button>Buy now</Button>)
    const cls = getByRole('button').className
    expect(cls).toMatch(/bg-\[var\(--accent\)\]/)
    expect(cls).toMatch(/rounded-\[8px\]/)
    expect(cls).not.toMatch(/shadow-(md|lg|xl)/)
  })

  test('secondary is transparent with a strong border', () => {
    const { getByRole } = render(<Button variant="secondary">More</Button>)
    const cls = getByRole('button').className
    expect(cls).toMatch(/border-\[var\(--border-strong\)\]/)
    expect(cls).toMatch(/bg-transparent/)
  })

  test('loading sets aria-busy and disables the button', () => {
    const { getByRole } = render(<Button loading>Pay</Button>)
    const btn = getByRole('button') as HTMLButtonElement
    expect(btn.getAttribute('aria-busy')).toBe('true')
    expect(btn.disabled).toBe(true)
  })
})

describe('Input primitive (§3.4)', () => {
  test('renders a label above (never placeholder-as-label)', () => {
    const { getByText, getByLabelText } = render(
      <Input label="Email address" placeholder="you@example.com" />,
    )
    expect(getByText('Email address')).toBeTruthy()
    expect(getByLabelText('Email address')).toBeTruthy()
  })

  test('has no default border, sunken bg, focus-only bottom border', () => {
    const { getByLabelText } = render(<Input label="Phone" />)
    const cls = getByLabelText('Phone').className
    expect(cls).toMatch(/border-0/)
    expect(cls).toMatch(/bg-\[var\(--surface-sunken\)\]/)
    expect(cls).toMatch(/focus:border-b-\[var\(--border-strong\)\]/)
  })

  test('error wires aria-invalid + describedby', () => {
    const { getByLabelText } = render(<Input label="Phone" error="Required" />)
    const el = getByLabelText('Phone')
    expect(el.getAttribute('aria-invalid')).toBe('true')
    expect(el.getAttribute('aria-describedby')).toBeTruthy()
  })
})

describe('Typography scale (§3.3)', () => {
  test('headlines use Inter Display, prices use tabular-nums', () => {
    expect(typography.h1).toMatch(/font-display/)
    expect(typography.h1).toMatch(/clamp\(48px,6vw,88px\)/)
    expect(typography.numeric).toMatch(/tabular-nums/)
    expect(typography.eyebrow).toMatch(/uppercase/)
    expect(typography.eyebrow).toMatch(/tracking-\[0\.14em\]/)
  })
})
