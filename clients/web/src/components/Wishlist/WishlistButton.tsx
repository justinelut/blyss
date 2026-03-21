'use client'

import { useAuth } from '@/hooks/auth'
import {
  useAddToWishlist,
  useIsInWishlist,
  useRemoveFromWishlist,
} from '@/hooks/queries/wishlist'
import Button from '@/components/atoms/Button'
import { Heart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface WishlistButtonProps {
  productId: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  showText?: boolean
}

export const WishlistButton = ({
  productId,
  variant = 'outline',
  size = 'md',
  fullWidth = false,
  showText = true,
}: WishlistButtonProps) => {
  const router = useRouter()
  const { authenticated } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const { data: checkData } = useIsInWishlist(productId)
  const isInWishlist = checkData?.is_in_wishlist ?? false

  const { mutate: addToWishlist } = useAddToWishlist()
  const { mutate: removeFromWishlist } = useRemoveFromWishlist()

  const handleClick = async () => {
    if (!authenticated) {
      router.push(
        `/login?return_to=${encodeURIComponent(window.location.pathname)}`,
      )
      return
    }

    setIsLoading(true)

    if (isInWishlist) {
      removeFromWishlist(productId, {
        onSettled: () => {
          setIsLoading(false)
        },
      })
    } else {
      addToWishlist(productId, {
        onSettled: () => {
          setIsLoading(false)
        },
      })
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      onClick={handleClick}
      disabled={isLoading}
      loading={isLoading}
      className="gap-2"
    >
      <Heart
        className={`h-4 w-4 ${isInWishlist ? 'fill-current' : ''}`}
        aria-hidden="true"
      />
      {showText && (
        <span>
          {isInWishlist ? 'Remove from Wishlist' : 'Save to Wishlist'}
        </span>
      )}
    </Button>
  )
}
