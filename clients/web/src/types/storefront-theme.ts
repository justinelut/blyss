/**
 * Storefront theme — shared TypeScript types.
 *
 * Per plan §19.3 (tokens), §19.4 (layouts), §19.5 (niche modules). Mirrored
 * server-side by `server/polar/organization/theme_schemas.py`. Both
 * sides MUST stay in lock-step — adding a token here without adding it
 * to the Pydantic schema will let invalid data through the PATCH endpoint.
 */

/**
 * Curated palette accents. Eight options. Adding a new accent requires:
 *  1. Updating `STOREFRONT_PALETTE` in `clients/web/src/design/storefront-palette.ts`
 *  2. Updating `AccentName` literal in `theme_schemas.py`
 *  3. Re-checking WCAG AA contrast on `--background #FAFAF7` and `--text-primary #1A1A17`
 */
export type AccentName =
  | 'burnt-orange'
  | 'forest'
  | 'clay'
  | 'ink'
  | 'oxblood'
  | 'bronze'
  | 'cobalt'
  | 'aubergine'

/**
 * Curated headline display fonts. Four options. Body is always Inter
 * (locked — see §19.3.3).
 */
export type HeadlineFont =
  | 'space-grotesk'
  | 'inter-display'
  | 'cormorant-garamond'
  | 'inter-tight'

/**
 * Display-style preset bundle. Translates to line-height, letter-spacing,
 * eyebrow weight, italic frequency overrides applied via CSS custom
 * properties on the storefront wrapper. See §19.3.3.
 */
export type DisplayStyle = 'editorial' | 'minimal' | 'bold'

/**
 * Motion-intensity multiplier. `prefers-reduced-motion` always overrides
 * to no-motion regardless of token. See §19.3.4.
 */
export type Motion = 'subtle' | 'standard' | 'expressive'

/**
 * Full token shape persisted on `organizations.theme_tokens`.
 *
 * `accent_secondary` is optional — each accent ships with a default
 * paired secondary, this overrides it. We don't use the secondary on the
 * v1 ship but the field is reserved so future modules can read it
 * without a schema migration.
 */
export interface StorefrontTokens {
  accent: AccentName
  accent_secondary?: AccentName
  headline_font: HeadlineFont
  display_style: DisplayStyle
  motion: Motion
}

/**
 * v1 default token set — applied to every existing organization on
 * migration so no creator's storefront visibly changes when the theme
 * system goes live.
 */
export const STOREFRONT_TOKENS_DEFAULTS: StorefrontTokens = {
  accent: 'burnt-orange',
  headline_font: 'space-grotesk',
  display_style: 'editorial',
  motion: 'standard',
} as const

/** Closed set of layout slugs. v1 ships only `editorial`. */
export type StorefrontLayoutSlug =
  | 'editorial'
  | 'gallery'
  | 'catalog'
  | 'portfolio'
  | 'studio'

/**
 * Niche-module kinds. v3 adds component implementations; v1 reserves
 * the type so the schema and registry are forward-compatible.
 */
export type ModuleKind =
  | 'waveform_player'
  | 'before_after_slider'
  | 'recipe_card'
  | 'curriculum_outline'
  | 'palette_swatches'
  | 'license_tier_picker'
  | 'specimens'

/** A single enabled module on a creator's storefront. */
export interface EnabledModule {
  kind: ModuleKind
  enabled: boolean
  /** Per-module config validated against the registry's Zod schema. */
  settings: Record<string, unknown>
  display_order: number
}
