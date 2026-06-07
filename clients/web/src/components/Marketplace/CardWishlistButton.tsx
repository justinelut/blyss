'use client'

/**
 * CardWishlistButton — small heart toggle that sits inside a product card.
 *
 * Etsy-style "save on hover" affordance. Stops propagation so clicking
 * doesn't trigger the wrapping <Link>'s navigation.
 *
 * Source of truth: the global useWishlist() query. We derive isSaved
 * client-side via items.some(i => i.product_id === productId) so a
 * marketplace grid of N cards costs ONE query (the wishlist itself,
 * already prefetched by the header heart badge) instead of N
 * /v1/wishlist/check/:id calls.
 *
 * Click behaviour:
 *   - Anonymous → /login with return_to
 *   - Saved    → remove from wishlist
 *   - Unsaved  → add to wishlist
 */

import { useMemo } from 'react'
import { FiHeart } from 'react-icons/fi'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/auth'
import {
  useAddToWishlist,
  useRemoveFromWishlist,
  useWishlist,
} from '@/hooks/queries/wishlist'
import { useToast } from '@/components/Toast/use-toast'
import { cn } from '@/lib/utils'

interface CardWishlistButtonProps {
  productId: string
  className?: string
}

interface WishlistItemLite {
  product_id: string
}

export function CardWishlistButton({
  productId,
  className,
}: CardWishlistButtonProps) {
  const router = useRouter()
  const { authenticated } = useAuth()
  // useWishlist with `enabled = authenticated` so guests don't fire a
  // 401 on every grid render.
  const { data } = useWishlist(authenticated)
  const { mutate: addToWishlist, isPending: isAdding } = useAddToWishlist()
  const { mutate: removeFromWishlist, isPending: isRemoving } =
    useRemoveFromWishlist()
  const { toast } = useToast()

  const isPending = isAdding || isRemoving

  // Derive saved state from the global wishlist query — matches the
  // server's truth and stays in sync after add/remove via the
  // mutation's cache invalidation.
  const isSaved = useMemo(() => {
    const items = (data as { items?: WishlistItemLite[] } | undefined)?.items ?? []
    return items.some((i) => i.product_id === productId)
  }, [data, productId])

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!authenticated) {
      const returnTo =
        typeof window !== 'undefined'
          ? window.location.pathname
          : '/marketplace'
      router.push(`/login?return_to=${encodeURIComponent(returnTo)}`)
      return
    }
    if (isSaved) {
      removeFromWishlist(productId, {
        onError: () => {
          toast({
            title: 'Could not remove right now',
            description: 'Try again in a moment.',
            variant: 'error',
            duration: 3000,
          })
        },
      })
      return
    }
    addToWishlist(productId, {
      onSuccess: () => {
        toast({
          title: 'Saved to wishlist',
          description:
            'Tap the heart in the header to view your saved items.',
          duration: 2500,
        })
      },
      onError: () => {
        toast({
          title: 'Could not save right now',
          description: 'Try again in a moment, or open the product to retry.',
          variant: 'error',
          duration: 3500,
        })
      },
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={isSaved}
      aria-label={isSaved ? 'Remove from wishlist' : 'Save to wishlist'}
      className={cn(
        'absolute top-2 right-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-elevated)]/95 backdrop-blur-sm transition-all',
        // Saved: always visible. Unsaved: hover-revealed on desktop,
        // always-visible on mobile (no hover state).
        isSaved
          ? 'opacity-100'
          : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100',
        'hover:scale-105 active:scale-95',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]',
        isSaved ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]',
        isPending && 'opacity-60',
        className,
      )}
    >
      <FiHeart
        size={16}
        className={cn(isSaved && 'fill-[var(--accent)]')}
        aria-hidden="true"
      />
    </button>
  )
}
