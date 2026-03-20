'use client'

import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import Input from '../atoms/Input'
import { Label } from '../ui/label'

export interface PriceRangeFilterProps {
  minPrice: number | null
  maxPrice: number | null
  onMinPriceChange: (value: number | null) => void
  onMaxPriceChange: (value: number | null) => void
  currency?: string
  className?: string
}

export function PriceRangeFilter({
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  currency = 'KES',
  className,
}: PriceRangeFilterProps): React.ReactElement {
  const [localMinPrice, setLocalMinPrice] = useState<string>(
    minPrice !== null ? minPrice.toString() : '',
  )
  const [localMaxPrice, setLocalMaxPrice] = useState<string>(
    maxPrice !== null ? maxPrice.toString() : '',
  )

  useEffect(() => {
    setLocalMinPrice(minPrice !== null ? minPrice.toString() : '')
  }, [minPrice])

  useEffect(() => {
    setLocalMaxPrice(maxPrice !== null ? maxPrice.toString() : '')
  }, [maxPrice])

  useEffect(() => {
    const timer = setTimeout(() => {
      const minValue = localMinPrice === '' ? null : Number(localMinPrice)
      const maxValue = localMaxPrice === '' ? null : Number(localMaxPrice)

      if (minValue !== minPrice) {
        onMinPriceChange(minValue)
      }
      if (maxValue !== maxPrice) {
        onMaxPriceChange(maxValue)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [
    localMinPrice,
    localMaxPrice,
    minPrice,
    maxPrice,
    onMinPriceChange,
    onMaxPriceChange,
  ])

  const handleMinPriceChange = useCallback((value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '')
    setLocalMinPrice(cleaned)
  }, [])

  const handleMaxPriceChange = useCallback((value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '')
    setLocalMaxPrice(cleaned)
  }, [])

  const handleClearMin = useCallback(() => {
    setLocalMinPrice('')
    onMinPriceChange(null)
  }, [onMinPriceChange])

  const handleClearMax = useCallback(() => {
    setLocalMaxPrice('')
    onMaxPriceChange(null)
  }, [onMaxPriceChange])

  const currencyLabel = (
    <span className="dark:text-polar-500 text-sm font-medium text-gray-500">
      {currency.toUpperCase()}
    </span>
  )

  const hasValidationError =
    localMinPrice !== '' &&
    localMaxPrice !== '' &&
    Number(localMinPrice) > Number(localMaxPrice)

  return (
    <div className={cn('space-y-3', className)}>
      <Label className="text-sm font-medium">Price Range</Label>
      <div className="space-y-2">
        <div>
          <Label htmlFor="min-price" className="sr-only">
            Minimum price
          </Label>
          <Input
            id="min-price"
            type="text"
            inputMode="numeric"
            value={localMinPrice}
            onChange={(e) => handleMinPriceChange(e.target.value)}
            placeholder="Min"
            preSlot={currencyLabel}
            postSlot={
              localMinPrice ? (
                <button
                  type="button"
                  onClick={handleClearMin}
                  className="pointer-events-auto cursor-pointer"
                  aria-label="Clear minimum price"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null
            }
            aria-label="Minimum price"
            aria-invalid={hasValidationError}
          />
        </div>

        <div>
          <Label htmlFor="max-price" className="sr-only">
            Maximum price
          </Label>
          <Input
            id="max-price"
            type="text"
            inputMode="numeric"
            value={localMaxPrice}
            onChange={(e) => handleMaxPriceChange(e.target.value)}
            placeholder="Max"
            preSlot={currencyLabel}
            postSlot={
              localMaxPrice ? (
                <button
                  type="button"
                  onClick={handleClearMax}
                  className="pointer-events-auto cursor-pointer"
                  aria-label="Clear maximum price"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null
            }
            aria-label="Maximum price"
            aria-invalid={hasValidationError}
          />
        </div>

        {hasValidationError && (
          <p className="text-xs text-red-600 dark:text-red-400">
            Minimum price must be less than or equal to maximum price
          </p>
        )}
      </div>
    </div>
  )
}
