/**
 * Storefront layout + module catalogs.
 *
 * Per plan §19.4 (layouts) and §19.5 (modules).
 *
 * The actual per-layout React component swap on /creators/{slug} is
 * a follow-up (v2 builds the 5 distinct layouts, v3 wires the 7
 * modules). At v1 the editor lets a creator persist their CHOICE to
 * the existing JSONB columns (`theme_layout`, `theme_modules`); the
 * public page falls back to the editorial layout for any unknown or
 * not-yet-implemented slug.
 *
 * Adding a new layout / module: append below + add to the matching
 * Literal in `server/polar/organization/theme_schemas.py` and
 * `clients/web/src/types/storefront-theme.ts`. The unit test in
 * `__tests__/storefront-layouts.test.ts` enforces parity.
 */

import type {
  ModuleKind,
  StorefrontLayoutSlug,
} from '@/types/storefront-theme'

export interface StorefrontLayoutDefinition {
  slug: StorefrontLayoutSlug
  name: string
  /** One-line description for the picker. */
  description: string
  /** Best-fit creator categories (informational, not enforced). */
  bestFor: string
  /** Which v? ships the actual layout component. v1 persists the
   *  choice but renders editorial; v2 ships the rest. */
  shipsIn: 'v1' | 'v2'
}

export const STOREFRONT_LAYOUTS: readonly StorefrontLayoutDefinition[] = [
  {
    slug: 'editorial',
    name: 'Editorial',
    description:
      'Cinematic hero, generous whitespace, magazine typography. The Blyss default.',
    bestFor: 'Creators selling identity-first — books, courses, art prints.',
    shipsIn: 'v1',
  },
  {
    slug: 'gallery',
    name: 'Gallery',
    description:
      'Grid-led with a soft hero. Image-density first, type quiet.',
    bestFor: 'Photographers, illustrators, fashion designers.',
    shipsIn: 'v2',
  },
  {
    slug: 'catalog',
    name: 'Catalog',
    description:
      'Thin identity row, list-row product layout for fast scanning.',
    bestFor: 'Many-SKU sellers — ebook authors, preset packs, beats.',
    shipsIn: 'v2',
  },
  {
    slug: 'portfolio',
    name: 'Portfolio',
    description:
      'Resume-style banner, project case-studies, product-as-evidence.',
    bestFor: 'Designers, agencies, freelancers selling templates.',
    shipsIn: 'v2',
  },
  {
    slug: 'studio',
    name: 'Studio',
    description:
      'Lab notebook. Text-led, dense, tagged collections, RSS feel.',
    bestFor: 'Writers, researchers, technical-content creators.',
    shipsIn: 'v2',
  },
] as const

// ---------------------------------------------------------------------------
// Modules — niche, opt-in components per category. v3 ships the actual
// rendering on /creators/{slug}; v1 just persists the toggles.
// ---------------------------------------------------------------------------

export interface StorefrontModuleDefinition {
  kind: ModuleKind
  name: string
  description: string
  /** Which creator categories the module is suggested for. */
  suggestedFor: string
}

export const STOREFRONT_MODULES: readonly StorefrontModuleDefinition[] = [
  {
    kind: 'waveform_player',
    name: 'Audio waveform player',
    description:
      'Inline waveform preview with scrub on each audio product card.',
    suggestedFor: 'Beats, sample packs, podcasts, sound design.',
  },
  {
    kind: 'before_after_slider',
    name: 'Before / after slider',
    description: 'Drag-to-reveal comparison on featured products.',
    suggestedFor: 'Photo presets, Lightroom packs, retouching.',
  },
  {
    kind: 'recipe_card',
    name: 'Recipe card',
    description:
      'Ingredients + step blocks rendered above the buy button on cookbook products.',
    suggestedFor: 'Cookbooks, meal-plan creators, food writers.',
  },
  {
    kind: 'curriculum_outline',
    name: 'Curriculum outline',
    description:
      'Module-by-module syllabus with run times for course products.',
    suggestedFor: 'Course creators, video tutorials.',
  },
  {
    kind: 'palette_swatches',
    name: 'Palette swatches',
    description: 'Render colour swatches alongside design assets.',
    suggestedFor: 'Brand kits, illustration packs, UI templates.',
  },
  {
    kind: 'license_tier_picker',
    name: 'License tier picker',
    description:
      'Personal / commercial / extended licence tiers for digital goods.',
    suggestedFor: 'Stock assets, fonts, 3D models.',
  },
  {
    kind: 'specimens',
    name: 'Type specimens',
    description: 'Live editable specimen blocks for each font product.',
    suggestedFor: 'Font designers, type foundries.',
  },
] as const
