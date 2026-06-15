import { describe, expect, it } from 'vitest'

import { STOREFRONT_PALETTE } from '@/design/storefront-palette'
import {
  STOREFRONT_THEME_PRESETS,
  findMatchingPreset,
} from '@/design/storefront-presets'
import { STOREFRONT_TOKENS_DEFAULTS } from '@/types/storefront-theme'

const VALID_FONTS = [
  'space-grotesk',
  'inter-display',
  'cormorant-garamond',
  'inter-tight',
] as const

const VALID_DISPLAY_STYLES = ['editorial', 'minimal', 'bold'] as const
const VALID_MOTIONS = ['subtle', 'standard', 'expressive'] as const

describe('STOREFRONT_THEME_PRESETS', () => {
  it('ships exactly 10 presets', () => {
    expect(STOREFRONT_THEME_PRESETS).toHaveLength(10)
  })

  it('every preset id is unique', () => {
    const ids = STOREFRONT_THEME_PRESETS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every preset accent exists in the palette', () => {
    const palette = Object.keys(STOREFRONT_PALETTE)
    for (const preset of STOREFRONT_THEME_PRESETS) {
      expect(palette).toContain(preset.tokens.accent)
    }
  })

  it('every preset uses one of the four shipped fonts', () => {
    for (const preset of STOREFRONT_THEME_PRESETS) {
      expect(VALID_FONTS).toContain(preset.tokens.headline_font)
    }
  })

  it('every preset uses a valid display_style', () => {
    for (const preset of STOREFRONT_THEME_PRESETS) {
      expect(VALID_DISPLAY_STYLES).toContain(preset.tokens.display_style)
    }
  })

  it('every preset uses a valid motion', () => {
    for (const preset of STOREFRONT_THEME_PRESETS) {
      expect(VALID_MOTIONS).toContain(preset.tokens.motion)
    }
  })

  it('every preset has a non-empty name + description', () => {
    for (const preset of STOREFRONT_THEME_PRESETS) {
      expect(preset.name.length).toBeGreaterThan(0)
      expect(preset.description.length).toBeGreaterThan(0)
    }
  })

  it('Blyss preset matches the v1 defaults', () => {
    const blyss = STOREFRONT_THEME_PRESETS.find((p) => p.id === 'blyss')
    expect(blyss).toBeDefined()
    expect(blyss!.tokens).toMatchObject({
      accent: STOREFRONT_TOKENS_DEFAULTS.accent,
      headline_font: STOREFRONT_TOKENS_DEFAULTS.headline_font,
      display_style: STOREFRONT_TOKENS_DEFAULTS.display_style,
      motion: STOREFRONT_TOKENS_DEFAULTS.motion,
    })
  })

  it('preset names are not generic AI slop', () => {
    // "Modern", "Premium", "Pro", "Default" are banned per the
    // anti-slop rules in plan/04 §3.
    const banned = ['modern', 'premium', 'pro', 'default', 'standard']
    for (const preset of STOREFRONT_THEME_PRESETS) {
      const lower = preset.name.toLowerCase()
      for (const word of banned) {
        expect(lower).not.toBe(word)
      }
    }
  })
})

describe('findMatchingPreset', () => {
  it('returns the matching preset when tokens equal it exactly', () => {
    const blyss = STOREFRONT_THEME_PRESETS[0]
    const match = findMatchingPreset(blyss.tokens)
    expect(match).toBeDefined()
    expect(match!.id).toBe('blyss')
  })

  it('returns null for a bespoke combination', () => {
    // Take Blyss but flip the motion — no preset should claim this.
    // (We need a combination that no preset uses; Blyss + expressive
    // is unique because Editorial uses inter-display, not space-grotesk.)
    const bespoke = {
      ...STOREFRONT_THEME_PRESETS[0].tokens,
      motion: 'expressive',
    } as const
    expect(findMatchingPreset(bespoke)).toBeNull()
  })

  it('matches by all four axes — accent alone is not enough', () => {
    // Atelier and a hypothetical "oxblood + space-grotesk" must NOT
    // collide. Build a token shape that swaps Atelier's font.
    const atelierSwapped = {
      ...STOREFRONT_THEME_PRESETS.find((p) => p.id === 'atelier')!.tokens,
      headline_font: 'space-grotesk' as const,
    }
    expect(findMatchingPreset(atelierSwapped)).toBeNull()
  })
})
