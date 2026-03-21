'use client'

import { useState, useEffect } from 'react'
import { Search, ShoppingCart, User, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks'

interface HeaderProps {
  search?: string
  onSearchChange?: (search: string) => void
}

export function Header({ search = '', onSearchChange }: HeaderProps) {
  const [localSearch, setLocalSearch] = useState(search)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const { currentUser, authenticated } = useAuth()

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search && onSearchChange) {
        onSearchChange(localSearch)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [localSearch, search, onSearchChange])

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
          <Link href="/cart" className="text-on-surface-variant hover:text-primary transition-colors scale-95 active:opacity-80">
            <ShoppingCart size={24} />
          </Link>
          
          {authenticated && currentUser ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors"
              >
                <User size={24} />
                <ChevronDown size={16} />
              </button>
              
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-surface-container-lowest rounded-lg shadow-lg py-2 border border-outline-variant">
                  <div className="px-4 py-3 border-b border-outline-variant">
                    <p className="text-sm font-medium text-on-surface">{currentUser.email}</p>
                  </div>
                  <Link
                    href="/dashboard"
                    className="block px-4 py-2 text-sm text-on-surface hover:bg-surface-container-high transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/dashboard/purchases"
                    className="block px-4 py-2 text-sm text-on-surface hover:bg-surface-container-high transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    My Purchases
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    className="block px-4 py-2 text-sm text-on-surface hover:bg-surface-container-high transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    Settings
                  </Link>
                  <div className="border-t border-outline-variant mt-2 pt-2">
                    <Link
                      href="/logout"
                      className="block px-4 py-2 text-sm text-error hover:bg-surface-container-high transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Sign Out
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="text-on-surface-variant hover:text-primary transition-colors scale-95 active:opacity-80">
              <User size={24} />
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
