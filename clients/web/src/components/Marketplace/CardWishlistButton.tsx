'use client'

/**
 * CardWishlistButton — small heart toggle that sits inside a product card.
 *
 * Etsy-style "save on hover" affordance. Stops propagation so clicking
 * doesn't trigger the wrapping <Link>'s navigation. On desktop the button
 * fades in on group hover; on mobile (no hover) it stays visible.
 *
 * Stays dumb: doesn't query wishlist status (would be 24 queries per
 * marketplace page). Just fires the add mutation. The wishlist page is the
 * source of truth; the post-click visual state is local optimism that
 * resets on navigation.
 */

import { useState } from 'react'
import { FiHeart } from 'react-icons/fi'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/auth'
import { useAddToWishlist } from '@/hooks/queries/wishlist'
import { cn } from '@/lib/utils'

interface CardWishlistButtonProps {
  productId: string
  className?: string
}

export function CardWishlistButton({
  productId,
  className,
}: CardWishlistButtonProps) {
  const router = useRouter()
  const { authenticated } = useAuth()
  const { mutate: addToWishlist, isPending } = useAddToWishlist()
  const [savedLocal, setSavedLocal] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!authenticated) {
      // Send to login with return-to so they come back to the page they
      // were browsing (the click swallowed the underlying card navigation).
      const returnTo =
        typeof window !== 'undefined' ? window.location.pathname : '/marketplace'
      router.push(`/login?return_to=${encodeURIComponent(returnTo)}`)
      return
    }
    addToWishlist(productId, {
      onSuccess: () => setSavedLocal(true),
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={savedLocal ? 'Saved to wishlist' : 'Save to wishlist'}
      className={cn(
        'absolute top-2 right-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-elevated)]/95 backdrop-blur-sm transition-all',
        // Hover-revealed on desktop, always-visible on mobile.
        'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100',
        'hover:scale-105 active:scale-95',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]',
        savedLocal ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]',
        isPending && 'opacity-60',
        className,
      )}
    >
      <FiHeart
        size={16}
        className={cn(savedLocal && 'fill-[var(--accent)]')}
        aria-hidden="true"
      />
    </button>
  )
}
