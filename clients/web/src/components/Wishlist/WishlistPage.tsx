'use client'

import Button from '@/components/atoms/Button'
import { EmptyWishlist } from '@/components/Wishlist/EmptyWishlist'
import { WishlistItem } from '@/components/Wishlist/WishlistItem'
import { useWishlist } from '@/hooks/queries/wishlist'
import { useCurrencyStore } from '@/stores/currencyStore'

const WishlistSkeleton = () => (
  <div className="flex animate-pulse flex-col gap-3 rounded-lg bg-white p-4 dark:bg-on-surface">
    <div
      className="w-full rounded-md bg-gray-200 dark:bg-gray-700"
      style={{ aspectRatio: '4/5' }}
    />
    <div className="space-y-2">
      <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-5 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
    </div>
    <div className="h-10 w-full rounded bg-gray-200 dark:bg-gray-700" />
  </div>
)

export const WishlistPage = () => {
  const { data: wishlist, isLoading, error, refetch } = useWishlist()
  const { currency } = useCurrencyStore()

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h1 className="font-epilogue mb-8 text-3xl font-semibold tracking-tight text-on-surface dark:text-white sm:text-4xl">
          My Wishlist
        </h1>
        <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" role="status" aria-live="polite" aria-label="Loading wishlist">
          {Array.from({ length: 8 }).map((_, i) => (
            <WishlistSkeleton key={i} />
          ))}
          <span className="sr-only">Loading your wishlist...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h1 className="font-epilogue mb-8 text-3xl font-semibold tracking-tight text-on-surface dark:text-white sm:text-4xl">
          My Wishlist
        </h1>
        <div className="rounded-lg bg-red-50 p-6 dark:bg-red-950/20" role="alert" aria-live="assertive">
          <p className="mb-4 text-sm text-red-800 dark:text-red-200">
            Failed to load wishlist. Please try again.
          </p>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (!wishlist || wishlist.items.length === 0) {
    return <EmptyWishlist />
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="font-epilogue text-3xl font-semibold tracking-tight text-on-surface dark:text-white sm:text-4xl">
          My Wishlist
        </h1>
        <p className="text-sm text-on-surface-variant dark:text-gray-400" role="status" aria-live="polite">
          {wishlist.items.length}{' '}
          {wishlist.items.length === 1 ? 'item' : 'items'}
        </p>
      </header>

      <section aria-label="Wishlist items">
        <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" role="list">
          {wishlist.items.map((item: any) => (
            <div key={item.id} role="listitem">
              <WishlistItem item={item} currency={currency} />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
