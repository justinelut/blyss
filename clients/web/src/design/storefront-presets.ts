/**
 * Storefront theme presets — curated bundles of the 4 token axes.
 *
 * Each preset is a one-click starter for new creators. They are PURE
 * TOKEN BUNDLES — no new schema, no new endpoint. Clicking a preset
 * sets the editor draft to `preset.tokens` and the existing dirty /
 * preview / save flow runs as if the creator had picked each axis by
 * hand.
 *
 * Adding an 11th preset: append one entry below. The unit test in
 * `__tests__/storefront-presets.test.ts` enforces that every preset's
 * accent + font + display_style + motion exists in the enum.
 *
 * Anti-slop rules:
 *   - No "Premium" / "Modern" / "Pro" preset names. Each name evokes
 *     a real aesthetic context (a place, a publication, a craft).
 *   - Only accents / fonts shipped in v1. No off-palette combinations.
 *   - Every preset must read on light mode (the marketplace default).
 */

import type { StorefrontTokens } from '@/types/storefront-theme'

export interface StorefrontThemePreset {
  /** Stable id used as the React key + localStorage key when a creator
   *  toggles between presets in a session. Lowercased + hyphenated. */
  id: string
  /** Display name shown on the preset card. */
  name: string
  /** One-line description of the aesthetic. */
  description: string
  /** Pre-bundled token shape applied on click. */
  tokens: StorefrontTokens
}

export const STOREFRONT_THEME_PRESETS: readonly StorefrontThemePreset[] = [
  {
    id: 'blyss',
    name: 'Blyss',
    description: 'Warm Kenyan craft. The default. Burnt orange on cream.',
    tokens: {
      accent: 'burnt-orange',
      headline_font: 'space-grotesk',
      display_style: 'editorial',
      motion: 'standard',
    },
  },
  {
    id: 'atelier',
    name: 'Atelier',
    description: 'Boutique luxury. Oxblood serifs, expressive transitions.',
    tokens: {
      accent: 'oxblood',
      headline_font: 'cormorant-garamond',
      display_style: 'editorial',
      motion: 'expressive',
    },
  },
  {
    id: 'studio',
    name: 'Studio',
    description: 'Restraint. Inter Display, ink black, no flourish.',
    tokens: {
      accent: 'ink',
      headline_font: 'inter-display',
      display_style: 'minimal',
      motion: 'subtle',
    },
  },
  {
    id: 'karen',
    name: 'Karen',
    description: 'Westlands warm earth. Clay terracotta with Cormorant.',
    tokens: {
      accent: 'clay',
      headline_font: 'cormorant-garamond',
      display_style: 'editorial',
      motion: 'standard',
    },
  },
  {
    id: 'bazaar',
    name: 'Bazaar',
    description: 'Dense product wall. Bronze accent, condensed type.',
    tokens: {
      accent: 'bronze',
      headline_font: 'inter-tight',
      display_style: 'bold',
      motion: 'standard',
    },
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Magazine typography. Inter Display at scale, expressive.',
    tokens: {
      accent: 'burnt-orange',
      headline_font: 'inter-display',
      display_style: 'editorial',
      motion: 'expressive',
    },
  },
  {
    id: 'gallery',
    name: 'Gallery',
    description: 'Whitespace and serif. Dover Street Market quiet.',
    tokens: {
      accent: 'ink',
      headline_font: 'cormorant-garamond',
      display_style: 'minimal',
      motion: 'subtle',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Outdoor. Deep green, condensed type, monastery-quiet.',
    tokens: {
      accent: 'forest',
      headline_font: 'inter-tight',
      display_style: 'minimal',
      motion: 'subtle',
    },
  },
  {
    id: 'cobalt',
    name: 'Cobalt',
    description: 'Type design / fintech. Editorial blue, Inter Display.',
    tokens: {
      accent: 'cobalt',
      headline_font: 'inter-display',
      display_style: 'minimal',
      motion: 'subtle',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Music, film, late-night digital. Aubergine, bold.',
    tokens: {
      accent: 'aubergine',
      headline_font: 'inter-display',
      display_style: 'bold',
      motion: 'standard',
    },
  },
] as const

/**
 * Find which preset (if any) matches the given tokens exactly. Used
 * by the editor to highlight the active preset card when the draft
 * happens to equal one. Returns null if the draft is bespoke.
 */
export const findMatchingPreset = (
  tokens: StorefrontTokens,
): StorefrontThemePreset | null => {
  for (const preset of STOREFRONT_THEME_PRESETS) {
    if (
      preset.tokens.accent === tokens.accent &&
      preset.tokens.headline_font === tokens.headline_font &&
      preset.tokens.display_style === tokens.display_style &&
      preset.tokens.motion === tokens.motion
    ) {
      return preset
    }
  }
  return null
}
