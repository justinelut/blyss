'use client'

import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { OptimizedImage } from '@/components/Image/OptimizedImage'
import { cn } from '@/lib/utils'

export interface ProductImageGalleryProps {
  /** Ordered list of image public URLs. First image is the LCP hero. */
  images: string[]
  /** Product name — used for alt text */
  productName: string
  className?: string
}

/**
 * ProductImageGallery — hero 4:5 + thumbnail strip with hover-zoom, mobile
 * swipe via horizontal scroll-snap with dot pagination.
 *
 * Per plan/07-pages.md §6.5 step 2:
 * - Hero is 4:5 aspect (editorial-tall)
 * - Thumbnail strip below; click thumbnail → swap hero
 * - Hero supports zoom on hover (subtle scale, no lightbox jankiness)
 * - Mobile: horizontal swipe with dot pagination
 *
 * The first image is rendered priority for LCP. All others lazy-load. Hover
 * zoom is a single subtle transform — never a full-page lightbox modal,
 * which is the §15.4 anti-pattern ("hover-zoom on every image" is a Bootstrap
 * marketplace tell).
 *
 * Empty state: if no images, render a tonal block at the right aspect ratio
 * so the layout doesn't reflow.
 */
export const ProductImageGallery = ({
  images,
  productName,
  className,
}: ProductImageGalleryProps) => {
  const reduce = useReducedMotion()
  const [activeIndex, setActiveIndex] = useState(0)
  const valid = images.filter(Boolean)
  const hasImages = valid.length > 0
  const heroSrc = hasImages ? valid[activeIndex] : undefined

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Hero — desktop view. The 4:5 ratio is enforced regardless of source
          dimensions so the column above-the-fold stays predictable. When
          there are NO images we fall back to a shorter typographic block so
          the empty PDP doesn't read as broken. */}
      <div className="hidden md:block">
        {hasImages ? (
          <motion.div
            initial={false}
            whileHover={reduce ? undefined : { scale: 1.02 }}
            transition={{
              duration: reduce ? 0 : 0.5,
              ease: [0.32, 0.72, 0, 1],
            }}
            className="relative aspect-[4/5] w-full overflow-hidden rounded-md bg-[var(--surface-sunken)]"
          >
            <OptimizedImage
              src={heroSrc}
              alt={`${productName} — image ${activeIndex + 1} of ${valid.length || 1}`}
              fill
              sizes="(max-width: 1024px) 50vw, 600px"
              priority
              className="rounded-md"
            />
            {/* Warm overlay tint per §3.4 — harmonizes mismatched creator
                photography to the palette. Single-tone, not a gradient. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[rgba(26,26,23,0.04)] mix-blend-multiply"
            />
          </motion.div>
        ) : (
          <div
            className="relative aspect-[4/5] w-full max-h-[520px] overflow-hidden rounded-md bg-[var(--surface)] p-10"
            aria-label={`${productName} — no images uploaded yet`}
          >
            <div className="flex h-full flex-col justify-between">
              <span className="font-display text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Blyss · Digital
              </span>
              <span
                aria-hidden="true"
                className="font-display text-[clamp(120px,16vw,220px)] font-semibold leading-none tracking-[-0.04em] text-[var(--border-strong)]"
              >
                {productName.charAt(0).toUpperCase()}
              </span>
              <span className="max-w-[24ch] font-display text-[20px] font-semibold leading-[1.15] text-[var(--text-primary)]">
                {productName}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Mobile — horizontal swipe with scroll-snap. CSS-driven; no JS swipe
          handler needed for this UX. Dots below indicate position. */}
      <div className="md:hidden">
        {hasImages ? (
          <div
            className="flex snap-x snap-mandatory overflow-x-auto rounded-md bg-[var(--surface-sunken)]"
            aria-label={`${productName} image carousel`}
          >
            {valid.map((src, i) => (
              <div
                key={i}
                className="relative aspect-[4/5] w-full shrink-0 snap-center"
              >
                <OptimizedImage
                  src={src}
                  alt={`${productName} — image ${i + 1} of ${valid.length}`}
                  fill
                  sizes="100vw"
                  priority={i === 0}
                  className="rounded-md"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-[rgba(26,26,23,0.04)] mix-blend-multiply"
                />
              </div>
            ))}
          </div>
        ) : (
          <div
            className="relative aspect-[4/5] w-full overflow-hidden rounded-md bg-[var(--surface)] p-6"
            aria-label={`${productName} — no images uploaded yet`}
          >
            <div className="flex h-full flex-col justify-between">
              <span className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Blyss · Digital
              </span>
              <span
                aria-hidden="true"
                className="font-display text-[clamp(96px,30vw,160px)] font-semibold leading-none tracking-[-0.04em] text-[var(--border-strong)]"
              >
                {productName.charAt(0).toUpperCase()}
              </span>
              <span className="max-w-[24ch] font-display text-[18px] font-semibold leading-[1.15] text-[var(--text-primary)]">
                {productName}
              </span>
            </div>
          </div>
        )}

        {/* Dot pagination — purely visual cue. Mobile users navigate via
            swipe; the dots reflect position via JS index but on first paint
            the active dot is index 0. */}
        {valid.length > 1 && (
          <div className="mt-4 flex items-center justify-center gap-1.5">
            {valid.map((_, i) => (
              <span
                key={i}
                aria-hidden="true"
                className={cn(
                  'h-1.5 w-1.5 rounded-full transition-colors',
                  i === activeIndex
                    ? 'bg-[var(--text-primary)]'
                    : 'bg-[var(--border-strong)]',
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnail strip — desktop only. 4:5 thumbs sized to fit a row of 5. */}
      {valid.length > 1 && (
        <div className="hidden gap-2 md:flex" role="tablist" aria-label="Product images">
          {valid.map((src, i) => {
            const isActive = i === activeIndex
            return (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Show image ${i + 1} of ${valid.length}`}
                onClick={() => setActiveIndex(i)}
                className={cn(
                  'relative aspect-[4/5] w-1/5 overflow-hidden rounded-sm bg-[var(--surface-sunken)] transition-opacity',
                  isActive
                    ? 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--background)]'
                    : 'opacity-70 hover:opacity-100',
                )}
              >
                <OptimizedImage
                  src={src}
                  alt=""
                  fill
                  sizes="120px"
                  className="rounded-sm"
                />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
