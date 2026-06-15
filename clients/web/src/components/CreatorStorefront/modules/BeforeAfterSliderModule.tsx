'use client'

/**
 * BeforeAfterSliderModule — drag-to-reveal photo comparison for
 * preset / Lightroom-pack creators. Per plan §19.5.
 *
 * v1 reads pairs from `settings.pairs: Array<{ before: url, after: url, label?: string }>`.
 * Module renders nothing if the creator hasn't configured pairs yet
 * (settings UI lands in a future phase).
 */

import * as React from 'react'

import { Eyebrow } from '@/design'
import { OptimizedImage } from '@/components/Image/OptimizedImage'

import type { StorefrontModuleProps } from './index'

interface BeforeAfterPair {
  before: string
  after: string
  label?: string
}

const readPairs = (settings: Record<string, unknown>): BeforeAfterPair[] => {
  const raw = settings.pairs
  if (!Array.isArray(raw)) return []
  return raw.filter((p): p is BeforeAfterPair => {
    return (
      !!p &&
      typeof p === 'object' &&
      typeof (p as BeforeAfterPair).before === 'string' &&
      typeof (p as BeforeAfterPair).after === 'string'
    )
  })
}

const SliderPair: React.FC<{ pair: BeforeAfterPair }> = ({ pair }) => {
  const [position, setPosition] = React.useState(50)
  return (
    <figure className="flex flex-col gap-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-[var(--surface-sunken)]">
        <OptimizedImage
          src={pair.before}
          alt={pair.label ? `${pair.label} — before` : 'Before'}
          fill
          className="object-cover"
        />
        <div
          className="pointer-events-none absolute inset-y-0 left-0 overflow-hidden"
          style={{ width: `${position}%` }}
        >
          <div
            className="absolute inset-y-0 left-0"
            style={{ width: `${10000 / Math.max(0.01, position)}%` }}
          >
            <OptimizedImage
              src={pair.after}
              alt={pair.label ? `${pair.label} — after` : 'After'}
              fill
              className="object-cover"
            />
          </div>
          <span
            className="absolute right-0 top-0 flex h-full w-px items-center bg-[var(--background)]"
            aria-hidden="true"
          />
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={position}
          onChange={(e) => setPosition(Number(e.target.value))}
          aria-label={pair.label ? `${pair.label} slider` : 'Before / after slider'}
          className="absolute inset-x-0 bottom-3 mx-auto w-[80%] accent-[var(--accent)]"
        />
      </div>
      {pair.label && (
        <figcaption className="font-sans text-[12px] text-[var(--text-muted)]">
          {pair.label}
        </figcaption>
      )}
    </figure>
  )
}

export const BeforeAfterSliderModule: {
  kind: 'before_after_slider'
  Component: React.FC<StorefrontModuleProps>
} = {
  kind: 'before_after_slider',
  Component: ({ settings }) => {
    const pairs = readPairs(settings)
    if (pairs.length === 0) return null
    return (
      <section className="mx-auto max-w-[1280px] px-6 py-12 md:px-16">
        <Eyebrow>Before / After</Eyebrow>
        <h2 className="mt-3 font-display text-[24px] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--text-primary)]">
          See the work in action
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pairs.map((pair, i) => (
            <SliderPair key={i} pair={pair} />
          ))}
        </div>
      </section>
    )
  },
}
