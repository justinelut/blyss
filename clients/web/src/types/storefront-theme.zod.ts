/**
 * Storefront theme — Zod schemas.
 *
 * Mirror of `server/polar/organization/theme_schemas.py`. The two sides
 * MUST stay in lock-step; if you add a token here, also add it on the
 * Pydantic side. Used by the dashboard form to validate before submit
 * — Pydantic rejects on the server too, so this is a UX shortcut, not a
 * security boundary.
 *
 * Per plan §19.3.
 */

import { z } from 'zod'

import type {
  AccentName,
  DisplayStyle,
  HeadlineFont,
  Motion,
  StorefrontTokens,
} from '@/types/storefront-theme'

// ---------------------------------------------------------------------------
// Layer 1 — Tokens
// ---------------------------------------------------------------------------

export const accentNameSchema = z.enum([
  'burnt-orange',
  'forest',
  'clay',
  'ink',
  'oxblood',
  'bronze',
  'cobalt',
  'aubergine',
] as const satisfies readonly AccentName[])

export const headlineFontSchema = z.enum([
  'space-grotesk',
  'inter-display',
  'cormorant-garamond',
  'inter-tight',
] as const satisfies readonly HeadlineFont[])

export const displayStyleSchema = z.enum([
  'editorial',
  'minimal',
  'bold',
] as const satisfies readonly DisplayStyle[])

export const motionSchema = z.enum([
  'subtle',
  'standard',
  'expressive',
] as const satisfies readonly Motion[])

/**
 * Full tokens schema. Strict — extra keys are rejected. The dashboard
 * form uses this to validate before POSTing to the preview endpoint or
 * the save endpoint. The matching Pydantic schema does the same on the
 * server (single source of truth would be nicer but we ship the same
 * literal lists in both languages so drift is detectable in the
 * acceptance test).
 */
export const storefrontTokensSchema = z
  .object({
    accent: accentNameSchema,
    accent_secondary: accentNameSchema.optional(),
    headline_font: headlineFontSchema,
    display_style: displayStyleSchema,
    motion: motionSchema,
  })
  .strict() satisfies z.ZodType<StorefrontTokens>

// ---------------------------------------------------------------------------
// Layer 2 — Layouts
// ---------------------------------------------------------------------------

export const storefrontLayoutSlugSchema = z.enum([
  'editorial',
  'gallery',
  'catalog',
  'portfolio',
  'studio',
] as const)

// ---------------------------------------------------------------------------
// Layer 3 — Niche modules
// ---------------------------------------------------------------------------

export const moduleKindSchema = z.enum([
  'waveform_player',
  'before_after_slider',
  'recipe_card',
  'curriculum_outline',
  'palette_swatches',
  'license_tier_picker',
  'specimens',
] as const)

export const enabledModuleSchema = z
  .object({
    kind: moduleKindSchema,
    enabled: z.boolean().default(true),
    settings: z.record(z.string(), z.unknown()).default({}),
    display_order: z.number().int().min(0).max(99).default(0),
  })
  .strict()
