'use client'

import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { Heart, ArrowRight } from 'lucide-react'
import { useWishlist, useRemoveFromWishlist } from '@/hooks/queries/wishlist'
import { MarketplaceProductCard } from '@/components/Marketplace/MarketplaceProductCard'
import { Skeleton, Eyebrow, typography, StaggerList, StaggerItem } from '@/design'
import { cn } from '@/lib/utils'

/**
 * BlyssWishlistPage — modernized wishlist with motion and editorial polish.
 */
export const BlyssWishlistPage = () => {
  const { data: wishlist, isLoading } = useWishlist()
  const { mutate: removeItem } = useRemoveFromWishlist()
  const reduce = useReducedMotion()
  const ease = [0.32, 0.72, 0, 1] as const

  const items = (wishlist as any)?.items ?? []

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1280px] px-6 py-12 md:px-16 md:py-16">
        <Skeleton className="mb-10 h-12 w-64" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-12">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <Skeleton aspectRatio="4/5" className="w-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="mx-auto max-w-[1280px] px-6 py-16 md:px-16 md:py-24">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
        >
          <Eyebrow accent>Wishlist</Eyebrow>
          <h1 className={cn(typography.h2, 'mt-3 max-w-[18ch] text-[var(--text-primary)]')}>
            Save what you love.
          </h1>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease, delay: 0.15 }}
          className="mt-10 max-w-[44ch]"
        >
          <p className={cn(typography.body, 'text-[var(--text-secondary)]')}>
            Your wishlist is empty. Tap the heart icon on any product to save
            it for later.
          </p>
          <Link
            href="/marketplace"
            className="group mt-8 inline-flex h-11 items-center gap-2 rounded-md bg-[var(--accent)] px-6 font-sans text-[14px] font-medium text-[var(--accent-foreground)] transition-all hover:bg-[var(--accent-hover)] hover:gap-3"
          >
            Browse the marketplace
            <ArrowRight
              size={15}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-12 md:px-16 md:py-16">
      <motion.header
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        className="mb-10 flex flex-wrap items-baseline justify-between gap-4"
      >
        <div>
          <Eyebrow accent>Wishlist</Eyebrow>
          <h1 className={cn(typography.h2, 'mt-3 text-[var(--text-primary)]')}>
            Saved items
          </h1>
        </div>
        <p className="font-sans text-[14px] text-[var(--text-muted)]">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </p>
      </motion.header>

      <StaggerList className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-12">
        <AnimatePresence>
          {items.map((item: any) => (
            <StaggerItem key={item.id}>
              <div className="group relative">
                <MarketplaceProductCard product={item.product} />
                <button
                  type="button"
                  onClick={() => removeItem(item.product.id)}
                  aria-label="Remove from wishlist"
                  className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-elevated)]/90 text-[var(--accent)] backdrop-blur-md transition-all hover:scale-105 hover:bg-[var(--surface-elevated)]"
                >
                  <Heart size={16} fill="currentColor" />
                </button>
              </div>
            </StaggerItem>
          ))}
        </AnimatePresence>
      </StaggerList>
    </div>
  )
}
