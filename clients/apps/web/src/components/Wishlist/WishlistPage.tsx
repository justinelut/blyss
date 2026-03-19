'use client'

import Spinner from '@/components/Shared/Spinner'
import { EmptyWishlist } from '@/components/Wishlist/EmptyWishlist'
import { WishlistItem } from '@/components/Wishlist/WishlistItem'
import { useWishlist } from '@/hooks/queries/wishlist'

export const WishlistPage = () => {
  const { data: wishlist, isLoading, error } = useWishlist()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
        <p className="text-sm text-red-800 dark:text-red-200">
          Failed to load wishlist. Please try again.
        </p>
      </div>
    )
  }

  if (!wishlist || wishlist.items.length === 0) {
    return <EmptyWishlist />
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6">
      <h1 className="dark:text-polar-50 mb-6 text-2xl font-bold text-gray-900 sm:mb-8 sm:text-3xl">
        My Wishlist
      </h1>

      <div className="space-y-3 sm:space-y-4">
        {wishlist.items.map((item: any) => (
          <WishlistItem key={item.id} item={item} />
        ))}
      </div>

      <div className="dark:text-polar-400 mt-4 text-sm text-gray-600 sm:mt-6">
        {wishlist.items.length} {wishlist.items.length === 1 ? 'item' : 'items'}{' '}
        in your wishlist
      </div>
    </div>
  )
}
