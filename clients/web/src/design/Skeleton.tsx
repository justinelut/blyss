'use client'

import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  /** Aspect ratio shortcut. Use for product/image skeletons. */
  aspectRatio?: '1/1' | '4/5' | '16/9' | '3/4'
  /** Animation off — for above-the-fold skeleton slots that should not pulse */
  static?: boolean
}

/**
 * Skeleton — Blyss-flavored loading skeleton.
 *
 * Per plan §3.4: surface-sunken with subtle pulse via `motion`. NOT animated
 * grey rectangles. Respects `prefers-reduced-motion`.
 *
 *   <Skeleton className="h-6 w-40" />
 *   <Skeleton aspectRatio="4/5" className="w-full" />
 */
export const Skeleton = ({ className, aspectRatio, static: isStatic }: SkeletonProps) => {
  const reduce = useReducedMotion()
  const animate = !isStatic && !reduce
    ? { opacity: [0.6, 1, 0.6] }
    : { opacity: 1 }

  const aspectClass = aspectRatio
    ? aspectRatio === '1/1'
      ? 'aspect-square'
      : aspectRatio === '4/5'
        ? 'aspect-[4/5]'
        : aspectRatio === '16/9'
          ? 'aspect-video'
          : 'aspect-[3/4]'
    : ''

  return (
    <motion.div
      className={cn(
        'rounded-md bg-[var(--surface-sunken)]',
        aspectClass,
        className,
      )}
      animate={animate}
      transition={{
        duration: 1.6,
        repeat: Infinity,
        ease: [0.32, 0.72, 0, 1],
      }}
      aria-hidden="true"
    />
  )
}
