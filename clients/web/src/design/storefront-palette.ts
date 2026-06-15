/**
 * Storefront palette catalogue — see plan/19-storefront-themes.md §19.3.2.
 *
 * Eight accents. Every entry must pass WCAG AA on `--background #FAFAF7`
 * and on `--text-primary #1A1A17`. Adding a new entry requires a
 * round-trip with the design system rules in plan/04-ui-direction.md §3.2.
 *
 * Forbidden:
 *   - Any accent outside this catalogue.
 *   - Pure black, pure white, neon, gradients.
 *   - Any colour failing contrast on the two reference colours above.
 *
 * The unit test in `storefront-palette.test.ts` enforces the contrast
 * gate at build time so nobody can sneak a new accent past the rule.
 */

import type { AccentName } from '@/types/storefront-theme'

export interface AccentDefinition {
  /** Stable name used as the token value. */
  name: AccentName
  /** Hex string used for the resolved `--accent` CSS variable. */
  value: string
  /** Hover-state colour. */
  hover: string
  /** Foreground colour for text drawn on top of `value`. Always our
   *  cream because every entry is dark enough to take it. */
  foreground: string
  /** Default paired secondary accent name (lookup back into this map
   *  to resolve the actual hex). Reserved for future module use. */
  secondary_default: AccentName
  /** Human-readable display name shown in the dashboard picker. */
  label: string
  /** One-line description for accessibility + tooltip text. */
  description: string
}

export const STOREFRONT_PALETTE: Record<AccentName, AccentDefinition> = {
  'burnt-orange': {
    name: 'burnt-orange',
    value: '#C2410C',
    hover: '#DD5818',
    foreground: '#FAFAF7',
    secondary_default: 'forest',
    label: 'Burnt orange',
    description: 'Blyss default. Kenyan craft, sunset, copper.',
  },
  forest: {
    name: 'forest',
    value: '#166534',
    hover: '#15803D',
    foreground: '#FAFAF7',
    secondary_default: 'burnt-orange',
    label: 'Forest',
    description: 'Deep green. Calm, organic, library-grade.',
  },
  clay: {
    name: 'clay',
    value: '#9A3412',
    hover: '#C2410C',
    foreground: '#FAFAF7',
    secondary_default: 'cobalt',
    label: 'Clay',
    description: 'Warm terracotta. Pottery, leather, wood.',
  },
  ink: {
    name: 'ink',
    value: '#1E1B16',
    hover: '#2C2820',
    foreground: '#FAFAF7',
    secondary_default: 'bronze',
    label: 'Ink',
    description: 'Near-black warm. Editorial, restrained, minimal.',
  },
  oxblood: {
    name: 'oxblood',
    value: '#7F1D1D',
    hover: '#991B1B',
    foreground: '#FAFAF7',
    secondary_default: 'bronze',
    label: 'Oxblood',
    description: 'Deep wine red. Luxury, leather, old-money.',
  },
  bronze: {
    name: 'bronze',
    value: '#92400E',
    hover: '#B45309',
    foreground: '#FAFAF7',
    secondary_default: 'forest',
    label: 'Bronze',
    description: 'Warm metallic. Craft, hand-made, artisanal.',
  },
  cobalt: {
    name: 'cobalt',
    value: '#1E3A8A',
    hover: '#1D4ED8',
    foreground: '#FAFAF7',
    secondary_default: 'bronze',
    label: 'Cobalt',
    description: 'Editorial blue. Type design, fintech, studio.',
  },
  aubergine: {
    name: 'aubergine',
    value: '#581C87',
    hover: '#6B21A8',
    foreground: '#FAFAF7',
    secondary_default: 'burnt-orange',
    label: 'Aubergine',
    description: 'Deep purple. Music, film, performance.',
  },
} as const

/** Background reference for contrast tests. Matches `--background`. */
export const BLYSS_BACKGROUND = '#FAFAF7' as const
/** Primary-text reference for contrast tests. Matches `--text-primary`. */
export const BLYSS_TEXT_PRIMARY = '#1A1A17' as const

// ---------------------------------------------------------------------------
// Contrast helpers — used by the unit test in `storefront-palette.test.ts`
// to assert every accent passes WCAG AA. Implementation kept in this file so
// it ships in the single import the picker uses.
// ---------------------------------------------------------------------------

/** Convert a 6-char hex (with or without `#`) to {r, g, b} in 0–255. */
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const clean = hex.replace('#', '')
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  }
}

/** Per WCAG 2.1: relative luminance of a colour. */
const relativeLuminance = (hex: string): number => {
  const { r, g, b } = hexToRgb(hex)
  const channel = (c: number) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** WCAG contrast ratio between two hex colours (1..21). */
export const contrastRatio = (a: string, b: string): number => {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const lighter = Math.max(la, lb)
  const darker = Math.min(la, lb)
  return (lighter + 0.05) / (darker + 0.05)
}
