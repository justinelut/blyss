'use client'

import { Search, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import Input from '../atoms/Input'

export interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
  className?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search products...',
  debounceMs = 300,
  className,
}: SearchInputProps): React.ReactElement {
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue)
      }
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [localValue, value, onChange, debounceMs])

  const handleClear = useCallback(() => {
    setLocalValue('')
    onChange('')
  }, [onChange])

  return (
    <div className={className}>
      <label htmlFor="search-input" className="sr-only">
        Search products
      </label>
      <Input
        id="search-input"
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        preSlot={<Search className="h-4 w-4" aria-hidden="true" />}
        postSlot={
          localValue ? (
            <button
              type="button"
              onClick={handleClear}
              className="pointer-events-auto cursor-pointer"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null
        }
        aria-label="Search products"
      />
    </div>
  )
}
