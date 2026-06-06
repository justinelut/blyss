'use client'

import { FiSearch } from 'react-icons/fi'
import { useState } from 'react'

interface CreatorHeroProps {
  onSearch: (query: string) => void
}

export function CreatorHero({ onSearch }: CreatorHeroProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(searchQuery)
  }

  return (
    <section className="mx-auto mb-20 max-w-7xl px-8">
      <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
        <div className="max-w-2xl">
          <h1 className="mb-6 font-headline text-6xl font-black leading-none tracking-tighter text-on-surface md:text-7xl">
            Meet the <span className="text-primary">Makers.</span>
          </h1>
          <p className="font-body text-xl leading-relaxed text-on-surface-variant">
            Discover the most visionary digital artisans. From Nairobi's
            pixel-perfect illustrators to coastal code-crafters.
          </p>
        </div>
        <div className="w-full md:w-96">
          <form onSubmit={handleSubmit} className="group relative">
            <label className="ml-1 mb-2 block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Find a creator
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border-none bg-surface-container-high px-6 py-4 text-on-surface placeholder:text-outline transition-all focus:ring-2 focus:ring-secondary"
              placeholder="Search by name or skill..."
            />
            <FiSearch className="absolute bottom-4 right-4 text-on-surface-variant" size={20} />
          </form>
        </div>
      </div>
    </section>
  )
}
