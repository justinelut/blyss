'use client'

import { schemas } from '@polar-sh/client'
import Avatar from '@polar-sh/ui/components/atoms/Avatar'
import { useRouter } from 'next/navigation'

interface CreatorCardProps {
  creator: schemas['CreatorSummarySchema']
}

export const CreatorCard = ({ creator }: CreatorCardProps) => {
  const router = useRouter()

  const handleClick = () => {
    router.push(`/creator/${creator.slug}`)
  }

  const productText =
    creator.product_count === 1
      ? '1 product'
      : `${creator.product_count} products`

  return (
    <div
      onClick={handleClick}
      className="cursor-pointer rounded-lg border border-gray-200 p-6 transition-shadow hover:shadow-lg dark:border-gray-800"
    >
      <div className="flex flex-col items-center text-center">
        <Avatar
          avatar_url={creator.avatar_url}
          name={creator.name}
          className="h-20 w-20"
        />

        <h3 className="mt-4 text-xl font-semibold">{creator.name}</h3>

        <p className="mt-2 text-gray-500 dark:text-gray-400">{productText}</p>
      </div>
    </div>
  )
}
