'use client'

import { useState, useMemo } from 'react'
import { Organization } from '@polar-sh/sdk'
import { CreatorHero } from './CreatorHero'
import { FeaturedSpotlight } from './FeaturedSpotlight'
import { FilterTabs } from './FilterTabs'
import { CreatorsGrid } from './CreatorsGrid'
import { LoadMoreButton } from './LoadMoreButton'

interface CreatorsDirectoryProps {
  initialCreators: Organization[]
}

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'illustrators', label: 'Illustrators' },
  { id: 'developers', label: 'Developers' },
  { id: 'photographers', label: 'Photographers' },
]

export function CreatorsDirectory({ initialCreators }: CreatorsDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [displayCount, setDisplayCount] = useState(6)

  // Get featured creator (first one with is_featured flag or just the first one)
  const featuredCreator = useMemo(() => {
    return (
      initialCreators.find((c) => c.profile_settings?.is_featured) ||
      initialCreators[0]
    )
  }, [initialCreators])

  // Filter creators based on search and active filter
  const filteredCreators = useMemo(() => {
    let creators = initialCreators.filter((c) => c.id !== featuredCreator?.id)

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      creators = creators.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.bio?.toLowerCase().includes(query) ||
          c.slug.toLowerCase().includes(query),
      )
    }

    // Apply category filter (placeholder - enhance based on your data)
    if (activeFilter !== 'all') {
      // For now, just return all creators
      // You can add category logic here based on your organization schema
    }

    return creators
  }, [initialCreators, searchQuery, activeFilter, featuredCreator])

  // Paginated creators
  const displayedCreators = filteredCreators.slice(0, displayCount)
  const hasMore = displayedCreators.length < filteredCreators.length

  const handleLoadMore = () => {
    setDisplayCount((prev) => prev + 6)
  }

  return (
    <div className="min-h-screen bg-background font-body text-on-surface selection:bg-primary-fixed selection:text-on-primary-fixed">
      <main className="pb-20 pt-32">
        {/* Hero Search Section */}
        <CreatorHero onSearch={setSearchQuery} />

        {/* Featured Spotlight */}
        {featuredCreator && <FeaturedSpotlight creator={featuredCreator} />}

        {/* Main Directory Grid */}
        <section className="mx-auto max-w-7xl px-8">
          <div className="mb-12 flex items-baseline justify-between">
            <h3 className="font-headline text-3xl font-bold">Community Talent</h3>
            <FilterTabs
              tabs={FILTER_TABS}
              activeTab={activeFilter}
              onTabChange={setActiveFilter}
            />
          </div>

          <CreatorsGrid creators={displayedCreators} />

          {/* Load More Button */}
          {hasMore && <LoadMoreButton onClick={handleLoadMore} />}
        </section>
      </main>
    </div>
  )
}
