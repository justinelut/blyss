'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

interface ProductImageGalleryProps {
  images: string[]
  productName: string
}

export const ProductImageGallery = ({
  images,
  productName,
}: ProductImageGalleryProps) => {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (!images || images.length === 0) {
    return (
      <div
        className="bg-surface-container-low flex w-full items-center justify-center rounded-lg"
        style={{ aspectRatio: '4/5' }}
      >
        <span className="text-on-surface-variant">No image available</span>
      </div>
    )
  }

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {/* Main Image with 4:5 aspect ratio */}
      <div
        className="bg-surface-container-low relative w-full overflow-hidden rounded-lg"
        style={{ aspectRatio: '4/5' }}
      >
        <Image
          src={images[currentIndex]}
          alt={`${productName} - Image ${currentIndex + 1}`}
          fill
          className="object-cover"
          priority={currentIndex === 0}
          loading={currentIndex === 0 ? 'eager' : 'lazy'}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />

        {images.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className="shadow-editorial absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-white/90 p-2 transition-all hover:bg-white active:scale-95 sm:p-2.5 dark:bg-gray-800/90 dark:hover:bg-gray-800"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <button
              onClick={handleNext}
              className="shadow-editorial absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-white/90 p-2 transition-all hover:bg-white active:scale-95 sm:p-2.5 dark:bg-gray-800/90 dark:hover:bg-gray-800"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail Navigation */}
      {images.length > 1 && (
        <div className="scrollbar-thin flex gap-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all active:scale-95 sm:h-20 sm:w-20 ${
                index === currentIndex
                  ? 'border-primary shadow-editorial'
                  : 'border-outline-variant/30 hover:border-outline-variant dark:border-gray-700 dark:hover:border-gray-600'
              }`}
            >
              <Image
                src={image}
                alt={`${productName} - Thumbnail ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 64px, 80px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
