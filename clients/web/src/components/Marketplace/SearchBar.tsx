'use client'

import { Loader2, Search, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface SearchResult {
  id: string
  name: string
  type: 'product' | 'creator'
  url: string
  thumbnail?: string
}

interface SearchBarProps {
  placeholder: string
  onSearch: (query: string) => void
  debounceMs?: number
  showResults?: boolean
  results?: SearchResult[]
  loading?: boolean
  className?: string
}

export const SearchBar = ({
  placeholder,
  onSearch,
  debounceMs = 300,
  showResults = false,
  results = [],
  loading = false,
  className,
}: SearchBarProps) => {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        onSearch(query)
        setIsOpen(true)
      } else {
        setIsOpen(false)
      }
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [query, debounceMs, onSearch])

  const handleClear = useCallback(() => {
    setQuery('')
    setIsOpen(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || results.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : prev,
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
          break
        case 'Enter':
          e.preventDefault()
          if (selectedIndex >= 0 && results[selectedIndex]) {
            window.location.href = results[selectedIndex].url
          }
          break
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          setSelectedIndex(-1)
          break
      }
    },
    [isOpen, results, selectedIndex],
  )

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={`relative ${className}`} role="search">
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-5 w-5 text-[#594139] dark:text-gray-400" aria-hidden="true" />
        </div>

        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-200 bg-white py-3 pr-10 pl-10 text-sm text-[#1b1c1b] placeholder:text-[#594139] focus:border-[#a73400] focus:ring-2 focus:ring-[#a73400]/20 focus:outline-none dark:border-gray-700 dark:bg-[#1b1c1b] dark:text-white dark:placeholder:text-gray-400"
          aria-label={placeholder}
          aria-expanded={isOpen}
          aria-controls="search-results"
          aria-activedescendant={
            selectedIndex >= 0 ? `result-${selectedIndex}` : undefined
          }
          aria-autocomplete="list"
        />

        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-[#594139] dark:text-gray-400" aria-label="Searching" />
          ) : query ? (
            <button
              type="button"
              onClick={handleClear}
              className="text-[#594139] hover:text-[#1b1c1b] dark:text-gray-400 dark:hover:text-white"
              aria-label="Clear search"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Results Dropdown */}
      {isOpen && showResults && query && (
        <div
          ref={resultsRef}
          id="search-results"
          className="absolute z-50 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-[0_12px_32px_rgba(27,28,27,0.06)] dark:border-gray-700 dark:bg-[#1b1c1b]"
          role="listbox"
          aria-label="Search results"
        >
          {loading ? (
            <div className="flex items-center justify-center py-8" role="status">
              <Loader2 className="h-6 w-6 animate-spin text-[#594139] dark:text-gray-400" aria-hidden="true" />
              <span className="sr-only">Loading search results</span>
            </div>
          ) : results.length > 0 ? (
            <div className="max-h-96 overflow-y-auto py-2">
              {results.map((result, index) => (
                <a
                  key={result.id}
                  id={`result-${index}`}
                  href={result.url}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    selectedIndex === index
                      ? 'bg-[#f6f3f1] dark:bg-[#2a2b2a]'
                      : 'hover:bg-[#f6f3f1] dark:hover:bg-[#2a2b2a]'
                  }`}
                  role="option"
                  aria-selected={selectedIndex === index}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  {result.thumbnail && (
                    <img
                      src={result.thumbnail}
                      alt=""
                      className="h-10 w-10 rounded object-cover"
                      aria-hidden="true"
                    />
                  )}
                  <div className="flex-1">
                    <div className="text-sm font-medium text-[#1b1c1b] dark:text-white">
                      {result.name}
                    </div>
                    <div className="text-xs text-[#594139] dark:text-gray-400">
                      {result.type === 'product' ? 'Product' : 'Creator'}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-[#594139] dark:text-gray-400" role="status">
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  )
}
