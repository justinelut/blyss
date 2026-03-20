'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/Select'

type SortOption = 'newest' | 'price_asc' | 'price_desc'

interface SortSelectProps {
  value: SortOption
  onChange: (value: SortOption) => void
  className?: string
}

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
]

export function SortSelect({ value, onChange, className }: SortSelectProps) {
  return (
    <div className={`flex flex-col gap-2 ${className || ''}`}>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Sort By
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={`w-48 ${className || ''}`}>
          <SelectValue placeholder="Select sort order" />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
