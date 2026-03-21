import { Button } from '@/components/ui/button'
import { Heart } from 'lucide-react'
import Link from 'next/link'

export const EmptyWishlist = () => {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <h1 className="font-epilogue mb-8 text-3xl font-semibold tracking-tight text-on-surface dark:text-white sm:text-4xl">
        My Wishlist
      </h1>

      <div className="flex flex-col items-center justify-center rounded-lg bg-surface py-16 dark:bg-[#2a2b2a]">
        <div className="mb-6 rounded-full bg-surface-container-low p-6 dark:bg-on-surface">
          <Heart className="h-16 w-16 text-on-surface-variant dark:text-gray-400" />
        </div>
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <h3 className="font-epilogue text-xl font-semibold tracking-tight text-on-surface dark:text-white">
            Your wishlist is empty
          </h3>
          <p className="text-sm text-on-surface-variant dark:text-gray-400">
            Save products you love to your wishlist
          </p>
        </div>
        <Link href="/products">
          <Button
            variant="default"
            className="bg-primary-700 text-white hover:bg-primary-800 dark:bg-primary-700 dark:hover:bg-primary-800"
          >
            Browse Products
          </Button>
        </Link>
      </div>
    </div>
  )
}
