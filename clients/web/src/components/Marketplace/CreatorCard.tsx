'use client'

import { schemas } from '@/lib/api'
import Avatar from '@/components/atoms/Avatar'
import Button from '@/components/atoms/Button'
import { OptimizedImage } from '@/components/Image/OptimizedImage'
import { useAuth } from '@/hooks/auth'
import Link from './LocaleLink'
import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { AuthModal } from '@/components/Auth/AuthModal'

interface CreatorCardProps {
  creator: schemas['Organization']
  sampleProducts?: schemas['Product'][]
  onFollow?: (creatorId: string) => void
  showFollowButton?: boolean
  followerCount?: number
}

export const CreatorCard = ({
  creator,
  sampleProducts = [],
  onFollow,
  showFollowButton = true,
  followerCount = 0,
}: CreatorCardProps) => {
  const { authenticated } = useAuth()
  const [showLoginModal, setShowLoginModal] = useState(false)

  const handleFollowClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Check authentication before following
    if (!authenticated) {
      setShowLoginModal(true)
      return
    }

    if (onFollow) {
      onFollow(creator.id)
    }
  }

  const displayProducts = sampleProducts.slice(0, 4)

  return (
    <>
      <Link
        href={`/${creator.slug}`}
        prefetch={true}
        className="group flex cursor-pointer flex-col gap-4 rounded-lg bg-[#f6f3f1] p-6 transition-all hover:shadow-[0_12px_32px_rgba(27,28,27,0.06)] dark:bg-[#2a2b2a]"
      >
        {/* Creator Header */}
        <div className="flex items-start gap-4">
          <Avatar
            avatar_url={creator.avatar_url}
            name={creator.name}
            className="h-16 w-16 shrink-0"
          />

          <div className="flex-1">
            <h3 className="font-epilogue text-lg font-semibold tracking-tight text-[#1b1c1b] dark:text-white">
              {creator.name}
            </h3>

            {creator.bio && (
              <p className="mt-1 line-clamp-2 text-sm text-[#594139] dark:text-gray-400">
                {creator.bio}
              </p>
            )}

            <div className="mt-2 flex items-center gap-4 text-sm text-[#594139] dark:text-gray-400">
              <span>{followerCount} followers</span>
            </div>
          </div>
        </div>

        {/* Sample Products - optimized with lazy loading */}
        {displayProducts.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {displayProducts.map((product) => {
              const thumbnail = product.medias?.[0]?.public_url
              return (
                <div
                  key={product.id}
                  className="aspect-square overflow-hidden rounded-md"
                >
                  <OptimizedImage
                    src={thumbnail}
                    alt={product.name}
                    fill
                    aspectRatio="1/1"
                    sizes="(max-width: 640px) 25vw, (max-width: 1024px) 15vw, 10vw"
                    className="rounded-md"
                  />
                </div>
              )
            })}
          </div>
        )}

        {/* Follow Button */}
        {showFollowButton && (
          <Button
            variant="outline"
            fullWidth
            onClick={handleFollowClick}
            className="mt-auto"
          >
            Follow
          </Button>
        )}
      </Link>

      {/* Login Modal */}
      <Modal
        title="Log In"
        isShown={showLoginModal}
        hide={() => setShowLoginModal(false)}
        modalContent={
          <AuthModal returnTo={`/${creator.slug}`} returnParams={{}} />
        }
      />
    </>
  )
}
