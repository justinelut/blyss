/**
 * Storefront module registry — per plan §19.5.
 *
 * Each module is a small React component opted-in by the creator from
 * the dashboard's Sections tab. A module:
 *   - Renders extra content on `/creators/{slug}` for the right kind
 *     of product (e.g. waveform player on audio products, specimens
 *     on font products).
 *   - Carries an optional `settings: Record<string, unknown>` blob
 *     that the creator configures from the dashboard. v1 ships with
 *     sensible defaults — settings UI lands in a future phase.
 *
 * Adding a module:
 *   1. New entry in the ModuleKind Literal in
 *      `clients/web/src/types/storefront-theme.ts` AND
 *      `server/polar/organization/theme_schemas.py` (must stay in lockstep).
 *   2. New entry in STOREFRONT_MODULES in
 *      `clients/web/src/design/storefront-layouts.ts`.
 *   3. New component file + entry below.
 *   4. Test asserts every kind has a renderer.
 */

import type { ComponentType } from 'react'

import { schemas } from '@/lib/api'
import type { EnabledModule, ModuleKind } from '@/types/storefront-theme'

export interface StorefrontModuleProps {
  /** All non-archived products by this creator. Modules filter to
   *  the ones they care about (audio, fonts, etc.) themselves. */
  products: schemas['Product'][]
  /** Free-form settings blob from the EnabledModule record. Modules
   *  validate / shape it themselves. */
  settings: Record<string, unknown>
}

export interface StorefrontModule {
  kind: ModuleKind
  Component: ComponentType<StorefrontModuleProps>
}

import { WaveformPlayerModule } from './WaveformPlayerModule'
import { BeforeAfterSliderModule } from './BeforeAfterSliderModule'
import { RecipeCardModule } from './RecipeCardModule'
import { CurriculumOutlineModule } from './CurriculumOutlineModule'
import { PaletteSwatchesModule } from './PaletteSwatchesModule'
import { LicenseTierPickerModule } from './LicenseTierPickerModule'
import { SpecimensModule } from './SpecimensModule'

const REGISTRY: Record<ModuleKind, StorefrontModule> = {
  waveform_player: WaveformPlayerModule,
  before_after_slider: BeforeAfterSliderModule,
  recipe_card: RecipeCardModule,
  curriculum_outline: CurriculumOutlineModule,
  palette_swatches: PaletteSwatchesModule,
  license_tier_picker: LicenseTierPickerModule,
  specimens: SpecimensModule,
}

export const resolveStorefrontModule = (
  kind: ModuleKind | string,
): StorefrontModule | null => {
  if (kind in REGISTRY) {
    return REGISTRY[kind as ModuleKind]
  }
  return null
}

/**
 * StorefrontModules — runtime renderer for the creator's enabled
 * module list. Filters out disabled entries, sorts by display_order,
 * and dispatches each one through the registry. Unknown kinds are
 * silently skipped so new server-side enum entries don't break older
 * deployed clients.
 */
export const StorefrontModules: React.FC<{
  modules: EnabledModule[]
  products: schemas['Product'][]
}> = ({ modules, products }) => {
  if (!modules || modules.length === 0) return null
  const sorted = [...modules]
    .filter((m) => m.enabled)
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
  if (sorted.length === 0) return null
  return (
    <>
      {sorted.map((m) => {
        const entry = resolveStorefrontModule(m.kind)
        if (!entry) return null
        const Component = entry.Component
        return (
          <Component
            key={m.kind}
            products={products}
            settings={m.settings ?? {}}
          />
        )
      })}
    </>
  )
}
