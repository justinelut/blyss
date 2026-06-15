'use client'

/**
 * LicenseTierPickerModule — personal / commercial / extended tier
 * comparison for stock-asset creators. Per plan §19.5.
 *
 * v1 reads `settings.tiers: Array<{ name: string, description: string, includes: string[] }>`.
 * Skips invalid entries.
 */

import { Eyebrow } from '@/design'

import type { StorefrontModuleProps } from './index'

interface LicenseTier {
  name: string
  description?: string
  includes: string[]
}

const readTiers = (settings: Record<string, unknown>): LicenseTier[] => {
  const raw = settings.tiers
  if (!Array.isArray(raw)) return []
  return raw
    .map((t): LicenseTier | null => {
      if (!t || typeof t !== 'object') return null
      const name = (t as { name?: unknown }).name
      const includes = (t as { includes?: unknown }).includes
      if (typeof name !== 'string' || !Array.isArray(includes)) return null
      return {
        name,
        description:
          typeof (t as { description?: unknown }).description === 'string'
            ? ((t as { description: string }).description)
            : undefined,
        includes: includes.filter(
          (i): i is string => typeof i === 'string',
        ),
      }
    })
    .filter((t): t is LicenseTier => t !== null)
}

export const LicenseTierPickerModule: {
  kind: 'license_tier_picker'
  Component: React.FC<StorefrontModuleProps>
} = {
  kind: 'license_tier_picker',
  Component: ({ settings }) => {
    const tiers = readTiers(settings)
    if (tiers.length === 0) return null
    return (
      <section className="mx-auto max-w-[1280px] px-6 py-12 md:px-16">
        <Eyebrow>Licensing</Eyebrow>
        <h2 className="mt-3 font-display text-[24px] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--text-primary)]">
          Choose how you&rsquo;ll use this
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiers.map((tier, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-md border border-[var(--border)] bg-[var(--background)] p-5"
            >
              <h3 className="font-display text-[18px] font-semibold text-[var(--text-primary)]">
                {tier.name}
              </h3>
              {tier.description && (
                <p className="font-sans text-[13px] leading-[1.55] text-[var(--text-secondary)]">
                  {tier.description}
                </p>
              )}
              <ul className="mt-1 flex flex-col gap-1.5 font-sans text-[12px] leading-[1.5] text-[var(--text-secondary)]">
                {tier.includes.map((line, li) => (
                  <li key={li} className="flex gap-2">
                    <span aria-hidden="true" className="text-[var(--accent)]">
                      ·
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    )
  },
}
