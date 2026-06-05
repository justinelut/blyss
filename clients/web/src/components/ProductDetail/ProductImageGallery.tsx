'use client'

import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { OptimizedImage } from '@/components/Image/OptimizedImage'
import { cn } from '@/lib/utils'
import { transitions, respectReducedMotion } from '@/design'

export interface ProductImageGalleryProps {
  images: string[]
  productName: string
  className?: string
}

/**
 * ProductImageGallery — editorial 4:5 hero + thumbnail rail.
 *
 * Desktop: hero with subtle zoom on hover + vertical/horizontal thumbnail rail.
 * Mobile: horizontal scroll-snap carousel with dot pagination.
 * Empty: typographic placeholder at aspect ratio.
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

  const heroTransition = respectReducedMotion(reduce, transitions.default)

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Desktop hero */}
      <div className="hidden md:block">
        {hasImages ? (
          <motion.div
            initial={false}
            whileHover={reduce ? undefined : { scale: 1.015 }}
            transition={heroTransition}
            className="relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-[var(--surface-sunken)]"
          >
            <OptimizedImage
              src={heroSrc}
              alt={`${productName} — image ${activeIndex + 1} of ${valid.length}`}
              fill
              sizes="(max-width: 1024px) 55vw, 640px"
              priority
              className="object-cover"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[rgba(26,26,23,0.03)] mix-blend-multiply"
            />
          </motion.div>
        ) : (
          <EmptyHero productName={productName} />
        )}
      </div>

      {/* Mobile carousel */}
      <div className="md:hidden">
        {hasImages ? (
          <div
            className="flex snap-x snap-mandatory gap-0 overflow-x-auto rounded-lg bg-[var(--surface-sunken)]"
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
                  className="object-cover"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-[rgba(26,26,23,0.03)] mix-blend-multiply"
                />
              </div>
            ))}
          </div>
        ) : (
          <EmptyHero productName={productName} mobile />
        )}

        {/* Dot pagination */}
        {valid.length > 1 && (
          <div className="mt-3 flex items-center justify-center gap-1.5">
            {valid.map((_, i) => (
              <span
                key={i}
                aria-hidden="true"
                className={cn(
                  'h-1.5 w-1.5 rounded-full transition-colors duration-200',
                  i === activeIndex
                    ? 'bg-[var(--text-primary)]'
                    : 'bg-[var(--border-strong)]',
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnail rail — desktop */}
      {valid.length > 1 && (
        <div
          className="hidden gap-2 md:flex"
          role="tablist"
          aria-label="Product images"
        >
          {valid.map((src, i) => {
            const isActive = i === activeIndex
            return (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Show image ${i + 1}`}
                onClick={() => setActiveIndex(i)}
                className={cn(
                  'relative aspect-[4/5] flex-1 max-w-[88px] overflow-hidden rounded-md bg-[var(--surface-sunken)] transition-all duration-200',
                  isActive
                    ? 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--background)]'
                    : 'opacity-60 hover:opacity-100',
                )}
              >
                <OptimizedImage
                  src={src}
                  alt=""
                  fill
                  sizes="88px"
                  className="object-cover"
                />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function EmptyHero({ productName, mobile }: { productName: string; mobile?: boolean }) {
  return (
    <div
      className={cn(
        'relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-[var(--surface)] p-8',
        mobile && 'p-6',
      )}
      aria-label={`${productName} — no images`}
    >
      <div className="flex h-full flex-col justify-between">
        <span className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Blyss · Digital
        </span>
        <span
          aria-hidden="true"
          className="font-display text-[clamp(100px,18vw,200px)] font-semibold leading-none tracking-[-0.04em] text-[var(--border)]"
        >
          {productName.charAt(0).toUpperCase()}
        </span>
        <span className="max-w-[24ch] font-display text-[18px] font-semibold leading-[1.15] text-[var(--text-primary)]">
          {productName}
        </span>
      </div>
    </div>
  )
}
