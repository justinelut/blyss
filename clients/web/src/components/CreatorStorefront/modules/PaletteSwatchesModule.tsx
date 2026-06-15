'use client'

/**
 * PaletteSwatchesModule — colour swatch grid for design-asset
 * creators. Per plan §19.5.
 *
 * v1 reads `settings.swatches: Array<{ hex: string, label?: string }>`.
 * Skips invalid entries.
 */

import { Eyebrow } from '@/design'

import type { StorefrontModuleProps } from './index'

interface Swatch {
  hex: string
  label?: string
}

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

const readSwatches = (settings: Record<string, unknown>): Swatch[] => {
  const raw = settings.swatches
  if (!Array.isArray(raw)) return []
  return raw
    .map((s): Swatch | null => {
      if (!s || typeof s !== 'object') return null
      const hex = (s as { hex?: unknown }).hex
      if (typeof hex !== 'string' || !HEX_RE.test(hex)) return null
      const label = (s as { label?: unknown }).label
      return {
        hex,
        label: typeof label === 'string' ? label : undefined,
      }
    })
    .filter((s): s is Swatch => s !== null)
}

export const PaletteSwatchesModule: {
  kind: 'palette_swatches'
  Component: React.FC<StorefrontModuleProps>
} = {
  kind: 'palette_swatches',
  Component: ({ settings }) => {
    const swatches = readSwatches(settings)
    if (swatches.length === 0) return null
    return (
      <section className="mx-auto max-w-[1280px] px-6 py-12 md:px-16">
        <Eyebrow>Palette</Eyebrow>
        <h2 className="mt-3 font-display text-[24px] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--text-primary)]">
          Colour notes
        </h2>
        <ul className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {swatches.map((sw, i) => (
            <li key={i} className="flex flex-col gap-2">
              <span
                aria-hidden="true"
                className="aspect-square w-full rounded-sm border border-[var(--border)]"
                style={{ backgroundColor: sw.hex }}
              />
              <div className="flex flex-col gap-0.5">
                {sw.label && (
                  <span className="font-sans text-[12px] font-medium text-[var(--text-primary)]">
                    {sw.label}
                  </span>
                )}
                <span className="font-mono text-[11px] uppercase text-[var(--text-muted)]">
                  {sw.hex}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    )
  },
}
