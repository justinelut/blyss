'use client'

/**
 * WaveformPlayerModule — inline preview row for audio products.
 * Per plan §19.5.
 *
 * v1 implementation: renders a flat list of audio products with a
 * native <audio> element (no waveform visualisation yet — that lands
 * once we ship a worker-driven peak generator). Every audio file
 * served to the browser is the creator's preview clip — full files
 * stay behind the buy gate, surfaced post-purchase.
 *
 * Filters in: products whose first media is `audio/*`. If the
 * creator has no audio products, the module renders nothing.
 */

import { Eyebrow } from '@/design'

import type { StorefrontModuleProps } from './index'

const isAudioProduct = (
  product: { medias?: Array<{ mime_type?: string | null }> } | null,
): boolean => {
  if (!product?.medias) return false
  return product.medias.some(
    (m) => typeof m?.mime_type === 'string' && m.mime_type.startsWith('audio/'),
  )
}

export const WaveformPlayerModule: { kind: 'waveform_player'; Component: React.FC<StorefrontModuleProps> } = {
  kind: 'waveform_player',
  Component: ({ products }) => {
    const audio = products.filter(isAudioProduct)
    if (audio.length === 0) return null

    return (
      <section className="mx-auto max-w-[1280px] px-6 py-12 md:px-16">
        <Eyebrow>Listen</Eyebrow>
        <h2 className="mt-3 font-display text-[24px] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--text-primary)]">
          Audio previews
        </h2>
        <ul className="mt-6 flex flex-col divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {audio.map((product) => {
            const audioMedia = product.medias?.find((m) =>
              m?.mime_type?.startsWith('audio/'),
            )
            if (!audioMedia?.public_url) return null
            return (
              <li
                key={product.id}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-6"
              >
                <div className="flex flex-col gap-0.5 sm:w-[280px]">
                  <span className="font-display text-[15px] font-medium text-[var(--text-primary)]">
                    {product.name}
                  </span>
                  {product.description && (
                    <span className="line-clamp-1 font-sans text-[12px] text-[var(--text-muted)]">
                      {product.description}
                    </span>
                  )}
                </div>
                <audio
                  controls
                  preload="none"
                  src={audioMedia.public_url}
                  className="w-full sm:flex-1"
                  aria-label={`Preview of ${product.name}`}
                >
                  Your browser does not support audio playback.
                </audio>
              </li>
            )
          })}
        </ul>
      </section>
    )
  },
}
