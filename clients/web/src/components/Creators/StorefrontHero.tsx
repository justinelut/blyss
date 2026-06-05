'use client'

import { useAuth } from '@/hooks/auth'
import { useFollowOrganization, useUnfollowOrganization } from '@/hooks/queries/org'
import { schemas } from '@/lib/api'
import Avatar from '@/components/atoms/Avatar'
import Button from '@/components/atoms/Button'
import { FiCalendar, FiPackage, FiUsers } from 'react-icons/fi'
import { useRouter } from 'next/navigation'
import { SocialLinks } from './SocialLinks'

interface StorefrontHeroProps {
  creator: schemas['CreatorStorefrontSchema']
}

export const StorefrontHero = ({ creator }: StorefrontHeroProps) => {
  const { currentUser } = useAuth()
  const router = useRouter()
  const followMutation = useFollowOrganization()
  const unfollowMutation = useUnfollowOrganization()

  const isFollowing = creator.is_following || false
  const isLoading = followMutation.isPending || unfollowMutation.isPending

  const handleFollowClick = () => {
    if (!currentUser) {
      router.push(`/login?return_to=/creator/${creator.slug}`)
      return
    }

    if (isFollowing) {
      unfollowMutation.mutate(creator.id)
    } else {
      followMutation.mutate(creator.id)
    }
  }

  const joinedDate = new Date(creator.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="relative">
      {/* Cover Image */}
      {creator.cover_url && (
        <div className="h-64 w-full overflow-hidden bg-surface-container-low lg:h-80">
          <img
            src={creator.cover_url}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Hero Content */}
      <div className="bg-surface-container-lowest shadow-editorial">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 py-8 lg:flex-row lg:items-end lg:justify-between">
            {/* Left: Avatar and Info */}
            <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-end">
              {/* Avatar */}
              <div className="-mt-16 lg:-mt-20">
                <Avatar
                  avatar_url={creator.avatar_url}
                  name={creator.name}
                  className="h-32 w-32 border-4 border-surface-container-lowest shadow-editorial lg:h-40 lg:w-40"
                />
              </div>

              {/* Creator Info */}
              <div className="flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
                <div>
                  <h1 className="font-epilogue text-on-surface text-4xl font-bold tracking-tight lg:text-5xl">
                    {creator.name}
                  </h1>
                  {creator.bio && (
                    <p className="text-on-surface-variant mt-2 text-lg">
                      {creator.bio}
                    </p>
                  )}
                </div>

                {/* Stats */}
                <div className="flex flex-wrap items-center gap-6 text-sm">
                  {creator.product_count !== undefined && (
                    <div className="text-on-surface-variant flex items-center gap-2">
                      <FiPackage className="h-4 w-4" />
                      <span>
                        {creator.product_count}{' '}
                        {creator.product_count === 1 ? 'Product' : 'Products'}
                      </span>
                    </div>
                  )}
                  {creator.follower_count !== undefined && (
                    <div className="text-on-surface-variant flex items-center gap-2">
                      <FiUsers className="h-4 w-4" />
                      <span>
                        {creator.follower_count}{' '}
                        {creator.follower_count === 1 ? 'Follower' : 'Followers'}
                      </span>
                    </div>
                  )}
                  <div className="text-on-surface-variant flex items-center gap-2">
                    <FiCalendar className="h-4 w-4" />
                    <span>Joined {joinedDate}</span>
                  </div>
                </div>

                {/* Social Links */}
                {creator.social_links && (
                  <div className="mt-2">
                    <SocialLinks links={creator.social_links} />
                  </div>
                )}
              </div>
            </div>

            {/* Right: Follow Button */}
            <div className="flex justify-center lg:justify-end">
              <Button
                onClick={handleFollowClick}
                disabled={isLoading}
                variant={isFollowing ? 'secondary' : 'default'}
                className="min-w-[120px]"
              >
                {isLoading ? 'Loading...' : isFollowing ? 'Following' : 'Follow'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
