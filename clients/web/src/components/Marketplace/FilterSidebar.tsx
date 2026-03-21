'use client'

import { schemas } from '@/lib/api'
import Button from '@/components/atoms/Button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Filter } from 'lucide-react'
import { useState } from 'react'

interface FilterSidebarProps {
  categories: schemas['Category'][]
  selectedCategories: string[]
  priceRange: [number, number]
  selectedCurrency: string
  onCategoryChange: (categories: string[]) => void
  onPriceRangeChange: (range: [number, number]) => void
  onClearFilters: () => void
  className?: string
}

export const FilterSidebar = ({
  categories,
  selectedCategories,
  priceRange,
  selectedCurrency,
  onCategoryChange,
  onPriceRangeChange,
  onClearFilters,
  className,
}: FilterSidebarProps) => {
  const [minPrice, setMinPrice] = useState(priceRange[0].toString())
  const [maxPrice, setMaxPrice] = useState(priceRange[1].toString())
  const [isOpen, setIsOpen] = useState(false)

  const handleCategoryToggle = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      onCategoryChange(selectedCategories.filter((id) => id !== categoryId))
    } else {
      onCategoryChange([...selectedCategories, categoryId])
    }
  }

  const handlePriceApply = () => {
    const min = parseInt(minPrice) || 0
    const max = parseInt(maxPrice) || 999999
    onPriceRangeChange([min, max])
  }

  const FilterContent = () => (
    <div className="flex flex-col gap-6" role="group" aria-label="Product filters">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-epilogue text-lg font-semibold tracking-tight text-[#1b1c1b] dark:text-white">
          Filters
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="text-sm text-[#594139] dark:text-gray-400"
          aria-label="Clear all filters"
        >
          Clear all
        </Button>
      </div>

      {/* Categories */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-[#1b1c1b] dark:text-white">
          Categories
        </legend>
        <div className="space-y-2" role="group" aria-label="Category filters">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center space-x-2">
              <Checkbox
                id={`category-${category.id}`}
                checked={selectedCategories.includes(category.id)}
                onCheckedChange={() => handleCategoryToggle(category.id)}
                aria-label={`Filter by ${category.name}`}
              />
              <Label
                htmlFor={`category-${category.id}`}
                className="cursor-pointer text-sm font-normal text-[#1b1c1b] dark:text-white"
              >
                {category.name}
              </Label>
            </div>
          ))}
        </div>
      </fieldset>

      {/* Price Range */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-[#1b1c1b] dark:text-white">
          Price Range ({selectedCurrency.toUpperCase()})
        </legend>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="Min"
              aria-label="Minimum price"
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-[#1b1c1b] placeholder:text-[#594139] focus:border-[#a73400] focus:ring-1 focus:ring-[#a73400] focus:outline-none dark:border-gray-700 dark:bg-[#1b1c1b] dark:text-white"
            />
            <span className="text-sm text-[#594139] dark:text-gray-400" aria-hidden="true">
              to
            </span>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Max"
              aria-label="Maximum price"
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-[#1b1c1b] placeholder:text-[#594139] focus:border-[#a73400] focus:ring-1 focus:ring-[#a73400] focus:outline-none dark:border-gray-700 dark:bg-[#1b1c1b] dark:text-white"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            fullWidth
            onClick={handlePriceApply}
            aria-label="Apply price range filter"
          >
            Apply
          </Button>
        </div>
      </fieldset>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:block ${className}`} aria-label="Product filters">
        <div className="sticky top-4 rounded-lg bg-[#f6f3f1] p-6 dark:bg-[#2a2b2a]">
          <FilterContent />
        </div>
      </aside>

      {/* Mobile Drawer */}
      <div className="lg:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2" aria-label="Open filters">
              <Filter className="h-4 w-4" aria-hidden="true" />
              Filters
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-80 bg-[#fcf9f7] dark:bg-[#1b1c1b]"
            aria-label="Product filters"
          >
            <div className="mt-6">
              <FilterContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
