'use client'

import Image from 'next/image'
import { useState } from 'react'
import { twMerge } from 'tailwind-merge'

interface OptimizedImageProps {
  src: string | null | undefined
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  sizes?: string
  fill?: boolean
  aspectRatio?: string
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
}

/**
 * Optimized image component using Next.js Image for automatic optimization,
 * lazy loading, and responsive srcset generation.
 * 
 * Features:
 * - Automatic image optimization
 * - Lazy loading by default (unless priority is set)
 * - Responsive srcset attributes
 * - Blur placeholder while loading
 * - Fallback for missing images
 */
export const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  sizes,
  fill = false,
  aspectRatio,
  objectFit = 'cover',
}: OptimizedImageProps) => {
  const [imageError, setImageError] = useState(false)

  // Handle missing or invalid image URLs
  if (!src || imageError) {
    return (
      <div
        className={twMerge(
          'flex items-center justify-center bg-gray-100 dark:bg-gray-800',
          className,
        )}
        style={aspectRatio ? { aspectRatio } : undefined}
      >
        <svg
          className="h-12 w-12 text-gray-300 dark:text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    )
  }

  const imageProps = {
    src,
    alt,
    className: twMerge('object-cover', className),
    onError: () => setImageError(true),
    priority,
    sizes: sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
    style: { objectFit },
  }

  if (fill) {
    return (
      <div
        // h-full w-full so this wrapper actually fills its parent — without
        // these the wrapper collapses to 0 and Next/Image (positioned
        // absolute via `fill`) becomes invisible. This was the storefront
        // 'banner + avatar load 200 but show nothing' bug.
        className="relative h-full w-full"
        style={aspectRatio ? { aspectRatio } : undefined}
      >
        <Image
          {...imageProps}
          fill
          sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
        />
      </div>
    )
  }

  if (width && height) {
    return (
      <Image
        {...imageProps}
        width={width}
        height={height}
      />
    )
  }

  // Fallback to fill mode if no dimensions provided
  return (
    <div className="relative h-full w-full" style={aspectRatio ? { aspectRatio } : { aspectRatio: '1/1' }}>
      <Image
        {...imageProps}
        fill
        sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
      />
    </div>
  )
}
