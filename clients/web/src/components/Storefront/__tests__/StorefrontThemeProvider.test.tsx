import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'

import { StorefrontThemeProvider } from '../StorefrontThemeProvider'
import { STOREFRONT_PALETTE } from '@/design/storefront-palette'
import type { StorefrontTokens } from '@/types/storefront-theme'

/**
 * StorefrontThemeProvider resolves token enums to concrete CSS custom
 * properties on a wrapper div. These tests pin the contract:
 *
 *   - The wrapper has data-storefront-theme = chosen accent name.
 *   - --accent / --accent-hover / --accent-foreground match palette.
 *   - --display flips between fonts based on headline_font.
 *   - Display style + motion translate to the documented values.
 *   - Unknown / missing token values fall back to v1 defaults instead
 *     of crashing.
 *
 * Per plan §19.3.5.
 */
describe('StorefrontThemeProvider', () => {
  const renderWith = (tokens: StorefrontTokens | null) =>
    render(
      <StorefrontThemeProvider tokens={tokens}>
        <span>body</span>
      </StorefrontThemeProvider>,
    )

  it('resolves accent + hover + foreground from the palette', () => {
    const tokens: StorefrontTokens = {
      accent: 'cobalt',
      headline_font: 'space-grotesk',
      display_style: 'editorial',
      motion: 'standard',
    }
    const { container } = renderWith(tokens)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.style.getPropertyValue('--accent')).toBe(
      STOREFRONT_PALETTE.cobalt.value,
    )
    expect(wrapper.style.getPropertyValue('--accent-hover')).toBe(
      STOREFRONT_PALETTE.cobalt.hover,
    )
    expect(wrapper.style.getPropertyValue('--accent-foreground')).toBe(
      STOREFRONT_PALETTE.cobalt.foreground,
    )
  })

  it('exposes the chosen accent name as data attribute', () => {
    const { container } = renderWith({
      accent: 'forest',
      headline_font: 'space-grotesk',
      display_style: 'editorial',
      motion: 'standard',
    })
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.getAttribute('data-storefront-theme')).toBe('forest')
  })

  it('flips --display when a non-default headline font is chosen', () => {
    const { container } = renderWith({
      accent: 'burnt-orange',
      headline_font: 'cormorant-garamond',
      display_style: 'editorial',
      motion: 'standard',
    })
    const wrapper = container.firstChild as HTMLElement
    const display = wrapper.style.getPropertyValue('--display')
    // Resolved against the next/font CSS variable; we don't assert the
    // exact font-family string (next/font generates it), only that we
    // pointed --display at the cormorant variable.
    expect(display).toContain('font-storefront-cormorant')
  })

  it('translates display_style to leading + tracking + eyebrow weight', () => {
    const editorial = renderWith({
      accent: 'burnt-orange',
      headline_font: 'space-grotesk',
      display_style: 'editorial',
      motion: 'standard',
    })
    const editorialWrapper = editorial.container.firstChild as HTMLElement
    expect(
      editorialWrapper.style.getPropertyValue('--storefront-leading'),
    ).toBe('1.05')
    expect(
      editorialWrapper.style.getPropertyValue('--storefront-tracking'),
    ).toBe('-0.02em')

    const bold = renderWith({
      accent: 'burnt-orange',
      headline_font: 'space-grotesk',
      display_style: 'bold',
      motion: 'standard',
    })
    const boldWrapper = bold.container.firstChild as HTMLElement
    expect(boldWrapper.style.getPropertyValue('--storefront-leading')).toBe(
      '0.95',
    )
    expect(
      boldWrapper.style.getPropertyValue('--storefront-tracking'),
    ).toBe('-0.03em')
  })

  it('translates motion to a duration multiplier', () => {
    const subtle = renderWith({
      accent: 'burnt-orange',
      headline_font: 'space-grotesk',
      display_style: 'editorial',
      motion: 'subtle',
    })
    expect(
      (subtle.container.firstChild as HTMLElement).style.getPropertyValue(
        '--storefront-motion-multiplier',
      ),
    ).toBe('0.5')

    const expressive = renderWith({
      accent: 'burnt-orange',
      headline_font: 'space-grotesk',
      display_style: 'editorial',
      motion: 'expressive',
    })
    expect(
      (expressive.container.firstChild as HTMLElement).style.getPropertyValue(
        '--storefront-motion-multiplier',
      ),
    ).toBe('1.2')
  })

  it('falls back to v1 defaults when tokens is null', () => {
    const { container } = renderWith(null)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.getAttribute('data-storefront-theme')).toBe('burnt-orange')
    expect(wrapper.style.getPropertyValue('--accent')).toBe(
      STOREFRONT_PALETTE['burnt-orange'].value,
    )
  })

  it('falls back to v1 defaults for unknown accent values', () => {
    const { container } = renderWith({
      // Cast through unknown to simulate a stale row with an
      // unrecognised accent name.
      accent: 'lavender' as unknown as StorefrontTokens['accent'],
      headline_font: 'space-grotesk',
      display_style: 'editorial',
      motion: 'standard',
    })
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.getAttribute('data-storefront-theme')).toBe('burnt-orange')
  })
})
