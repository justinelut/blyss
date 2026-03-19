'use client'

import { cn } from '@/lib/utils'
import React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../atoms/Select'

export type SortOption = 'newest' | 'price_asc' | 'price_desc'

export interface SortSelectProps {
  value: SortOption
  onChange: (value: SortOption) => void
  className?: string
}

const SORT_OPTIONS: Record<SortOption, string> = {
  newest: 'Newest First',
  price_asc: 'Price: Low to High',
  price_desc: 'Price: High to Low',
}

export function SortSelect({
  value,
  onChange,
  className,
}: SortSelectProps): React.ReactElement {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn('w-[200px]', className)}>
        <SelectValue placeholder="Sort by" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(SORT_OPTIONS).map(([key, label]) => (
          <SelectItem key={key} value={key}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
