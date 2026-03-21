'use client'

import { schemas } from '@/lib/api'
import Avatar from '@/components/atoms/Avatar'
import Button from '@/components/atoms/Button'
import { SocialLinks } from './SocialLinks'

interface StorefrontSidebarProps {
  creator: schemas['CreatorStorefrontSchema']
}

export const StorefrontSidebar = ({ creator }: StorefrontSidebarProps) => {
  return (
    <aside className="w-full lg:sticky lg:top-4 lg:w-80 lg:self-start">
      <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
        <Avatar
          avatar_url={creator.avatar_url}
          name={creator.name}
          className="h-24 w-24"
        />

        <h1 className="mt-4 text-2xl font-bold">{creator.name}</h1>

        {creator.bio && (
          <p className="mt-4 text-gray-600 dark:text-gray-400">{creator.bio}</p>
        )}

        {creator.social_links && (
          <div className="mt-4">
            <SocialLinks links={creator.social_links} />
          </div>
        )}

        <div className="mt-6 flex w-full flex-col gap-3">
          <Button variant="default" fullWidth>
            Subscribe
          </Button>
          <Button variant="secondary" fullWidth>
            Donate
          </Button>
        </div>
      </div>
    </aside>
  )
}
