'use client'

import { cn } from '@/lib/utils'
import { Label } from '../ui/label'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'

export interface Category {
  id: string
  name: string
  count: number
}

export interface CategoryFilterProps {
  categories: Category[]
  selectedCategory: string | null
  onChange: (categoryId: string | null) => void
  className?: string
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onChange,
  className,
}: CategoryFilterProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <Label className="text-sm font-medium">Category</Label>
      <RadioGroup
        value={selectedCategory || 'all'}
        onValueChange={(value) => onChange(value === 'all' ? null : value)}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="all" id="category-all" />
          <Label
            htmlFor="category-all"
            className={cn(
              'flex flex-1 cursor-pointer items-center justify-between font-normal',
              selectedCategory === null && 'font-medium',
            )}
          >
            <span>All Categories</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {categories.reduce((sum, cat) => sum + cat.count, 0)}
            </span>
          </Label>
        </div>

        {categories.map((category) => (
          <div key={category.id} className="flex items-center space-x-2">
            <RadioGroupItem
              value={category.id}
              id={`category-${category.id}`}
            />
            <Label
              htmlFor={`category-${category.id}`}
              className={cn(
                'flex flex-1 cursor-pointer items-center justify-between font-normal',
                selectedCategory === category.id && 'font-medium',
              )}
            >
              <span>{category.name}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {category.count}
              </span>
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  )
}
