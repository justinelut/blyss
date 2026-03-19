'use client'

import { useCreators } from '@/hooks/queries/creators'
import { schemas } from '@polar-sh/client'
import Input from '@polar-sh/ui/components/atoms/Input'
import { useState } from 'react'
import { CreatorCard } from './CreatorCard'

interface CreatorsDirectoryProps {
  initialCreators: schemas['CreatorSummarySchema'][]
}

export const CreatorsDirectory = ({
  initialCreators,
}: CreatorsDirectoryProps) => {
  const [search, setSearch] = useState('')

  const { data: creators, error } = useCreators(
    { search: search || undefined },
    {
      initialData: initialCreators,
      keepPreviousData: true,
    },
  )

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">
            Failed to load creators. Please try again.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="mb-4 text-3xl font-bold">Discover Creators</h1>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          Browse creators and their products on the Blyss marketplace
        </p>

        <div className="max-w-md">
          <Input
            type="search"
            placeholder="Search creators..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {creators && creators.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {creators.map((creator) => (
            <CreatorCard key={creator.id} creator={creator} />
          ))}
        </div>
      ) : (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">
              No creators found matching your search.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
