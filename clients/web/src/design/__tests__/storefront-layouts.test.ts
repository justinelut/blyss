import { describe, expect, it } from 'vitest'

import {
  STOREFRONT_LAYOUTS,
  STOREFRONT_MODULES,
} from '@/design/storefront-layouts'

describe('STOREFRONT_LAYOUTS', () => {
  it('ships exactly 5 layouts', () => {
    expect(STOREFRONT_LAYOUTS).toHaveLength(5)
  })

  it('every slug is unique', () => {
    const slugs = STOREFRONT_LAYOUTS.map((l) => l.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('matches the spec §19.4 enum', () => {
    const expected = ['editorial', 'gallery', 'catalog', 'portfolio', 'studio']
    for (const slug of expected) {
      expect(STOREFRONT_LAYOUTS.find((l) => l.slug === slug)).toBeDefined()
    }
  })

  it('every layout ships in v1 (all 5 layouts have a hero + work section)', () => {
    // Earlier the catalog/gallery/portfolio/studio layouts shipped only
    // their data (so the editor could persist a creator's choice while
    // the public page rendered editorial). They each ship a real hero
    // and work section now — none should be marked v2.
    const v1 = STOREFRONT_LAYOUTS.filter((l) => l.shipsIn === 'v1')
    expect(v1).toHaveLength(5)
    const v2 = STOREFRONT_LAYOUTS.filter((l) => l.shipsIn === 'v2')
    expect(v2).toHaveLength(0)
  })

  it('every layout has a non-empty name + description + bestFor', () => {
    for (const layout of STOREFRONT_LAYOUTS) {
      expect(layout.name.length).toBeGreaterThan(0)
      expect(layout.description.length).toBeGreaterThan(0)
      expect(layout.bestFor.length).toBeGreaterThan(0)
    }
  })
})

describe('STOREFRONT_MODULES', () => {
  it('ships exactly 7 modules', () => {
    expect(STOREFRONT_MODULES).toHaveLength(7)
  })

  it('matches the spec §19.5 enum', () => {
    const expected = [
      'waveform_player',
      'before_after_slider',
      'recipe_card',
      'curriculum_outline',
      'palette_swatches',
      'license_tier_picker',
      'specimens',
    ]
    const kinds = STOREFRONT_MODULES.map((m) => m.kind)
    expect(new Set(kinds).size).toBe(kinds.length)
    for (const k of expected) {
      expect(kinds).toContain(k)
    }
  })

  it('every module has a non-empty name + description + suggestedFor', () => {
    for (const m of STOREFRONT_MODULES) {
      expect(m.name.length).toBeGreaterThan(0)
      expect(m.description.length).toBeGreaterThan(0)
      expect(m.suggestedFor.length).toBeGreaterThan(0)
    }
  })
})
