'use client'

import { useState, useEffect } from 'react'
import { Search, ShoppingCart, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface SearchBarProps {
  search: string
  onSearchChange: (search: string) => void
}

export function SearchBar({ search, onSearchChange }: SearchBarProps) {
  const [localSearch, setLocalSearch] = useState(search)
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) {
        onSearchChange(localSearch)
        const params = new URLSearchParams()
        if (localSearch) params.set('search', localSearch)
        router.push(`/search?${params.toString()}`)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [localSearch, search, onSearchChange, router])

  return (
    <header className="fixed top-0 w-full z-50 bg-background backdrop-blur-xl">
      <div className="flex justify-between items-center px-8 h-20 max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-12">
          <Link href="/" className="text-2xl font-bold text-on-surface font-headline tracking-tight">
            The Modern Curator
          </Link>
          <nav className="hidden md:flex gap-8 font-headline tracking-tight">
            <Link
              href="/search"
              className="text-primary border-b-2 border-primary pb-1 transition-colors duration-200"
            >
              Explore
            </Link>
            <Link
              href="/creators"
              className="text-on-surface-variant hover:text-primary transition-colors duration-200"
            >
              Creators
            </Link>
            <Link
              href="/subscriptions"
              className="text-on-surface-variant hover:text-primary transition-colors duration-200"
            >
              Subscriptions
            </Link>
          </nav>
        </div>

        <div className="flex-1 max-w-md mx-8">
          <div className="relative group">
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full bg-surface-container-high border-none rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-secondary transition-all"
              placeholder="Search digital assets..."
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button className="text-on-surface-variant hover:text-primary transition-colors scale-95 active:opacity-80">
            <ShoppingCart size={24} />
          </button>
          <button className="text-on-surface-variant hover:text-primary transition-colors scale-95 active:opacity-80">
            <User size={24} />
          </button>
        </div>
      </div>
    </header>
  )
}
