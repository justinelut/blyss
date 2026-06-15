'use client'

/**
 * SpecimensModule — live editable type-specimen blocks for font
 * designers. Per plan §19.5.
 *
 * v1 reads `settings.specimens: Array<{ family: string, weight?: number, sample?: string }>`.
 * The `family` string is dropped into `font-family` directly — the
 * creator's font must already be self-hosted and reachable on the
 * page (the v1 module doesn't fetch fonts itself).
 *
 * If no specimens are configured, the module renders nothing.
 */

import * as React from 'react'

import { Eyebrow } from '@/design'

import type { StorefrontModuleProps } from './index'

interface Specimen {
  family: string
  weight?: number
  sample?: string
}

const DEFAULT_SAMPLE = 'The quick brown fox jumps over the lazy dog'

const readSpecimens = (
  settings: Record<string, unknown>,
): Specimen[] => {
  const raw = settings.specimens
  if (!Array.isArray(raw)) return []
  return raw
    .map((s): Specimen | null => {
      if (!s || typeof s !== 'object') return null
      const family = (s as { family?: unknown }).family
      if (typeof family !== 'string') return null
      return {
        family,
        weight:
          typeof (s as { weight?: unknown }).weight === 'number'
            ? ((s as { weight: number }).weight)
            : undefined,
        sample:
          typeof (s as { sample?: unknown }).sample === 'string'
            ? ((s as { sample: string }).sample)
            : undefined,
      }
    })
    .filter((s): s is Specimen => s !== null)
}

const SpecimenBlock: React.FC<{ specimen: Specimen }> = ({ specimen }) => {
  const [text, setText] = React.useState(specimen.sample ?? DEFAULT_SAMPLE)
  return (
    <article className="flex flex-col gap-3 border-b border-[var(--border)] py-8">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-sans text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          {specimen.family}
          {specimen.weight && ` · ${specimen.weight}`}
        </h3>
      </div>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label={`Edit ${specimen.family} specimen text`}
        className="w-full border-0 bg-transparent p-0 leading-[1.05] tracking-[-0.02em] text-[var(--text-primary)] outline-none transition-colors focus:text-[var(--accent)]"
        style={{
          fontFamily: specimen.family,
          fontWeight: specimen.weight ?? 400,
          fontSize: 'clamp(40px, 7vw, 96px)',
        }}
      />
    </article>
  )
}

export const SpecimensModule: {
  kind: 'specimens'
  Component: React.FC<StorefrontModuleProps>
} = {
  kind: 'specimens',
  Component: ({ settings }) => {
    const specimens = readSpecimens(settings)
    if (specimens.length === 0) return null
    return (
      <section className="mx-auto max-w-[1280px] px-6 py-12 md:px-16">
        <Eyebrow>Specimens</Eyebrow>
        <h2 className="mt-3 font-display text-[24px] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--text-primary)]">
          Try the type
        </h2>
        <div className="mt-6 flex flex-col border-t border-[var(--border)]">
          {specimens.map((sp, i) => (
            <SpecimenBlock key={i} specimen={sp} />
          ))}
        </div>
      </section>
    )
  },
}
