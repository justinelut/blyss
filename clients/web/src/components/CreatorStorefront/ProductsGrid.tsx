'use client'

import { Product } from '@polar-sh/sdk'
import { Filter } from 'lucide-react'

interface ProductsGridProps {
  products: Product[]
}

export function ProductsGrid({ products }: ProductsGridProps) {
  if (products.length === 0) {
    return (
      <section className="mx-auto max-w-screen-xl px-8 py-24">
        <p className="text-center text-on-surface-variant">No products available yet.</p>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-screen-xl px-8 py-24">
      <div className="mb-12 flex flex-col items-center justify-between gap-8 md:flex-row">
        <h2 className="font-headline text-4xl font-bold tracking-tight">
          Available Assets
        </h2>
        <div className="flex gap-4">
          <button className="rounded-lg bg-surface-container p-2">
            <Filter size={20} />
          </button>
          <div className="flex rounded-full bg-surface-container-high p-1">
            <button className="rounded-full bg-surface-container-lowest px-6 py-1 text-sm font-bold shadow-sm">
              Digital
            </button>
            <button className="px-6 py-1 text-sm font-medium text-on-surface-variant">
              Physical
            </button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => {
          const price = product.prices?.[0]
          const priceAmount = price ? (price.price_amount / 100).toFixed(0) : '0'

          return (
            <div key={product.id} className="group cursor-pointer">
              <div className="mb-4 aspect-[4/5] overflow-hidden rounded-lg bg-surface-container-lowest">
                {product.media && product.media.length > 0 ? (
                  <img
                    src={product.media[0].public_url}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-100 to-pink-100">
                    <span className="text-4xl font-bold text-gray-400">
                      {product.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold transition-colors group-hover:text-primary">
                    {product.name}
                  </h3>
                  <p className="text-sm text-on-surface-variant">
                    {product.description?.substring(0, 30) || 'Digital Asset'}
                  </p>
                </div>
                <span className="text-xl font-black">${priceAmount}</span>
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-20 flex justify-center">
        <button className="rounded-lg border-2 border-outline px-10 py-4 font-bold text-on-surface-variant transition-all hover:bg-surface-container">
          View Entire Catalog
        </button>
      </div>
    </section>
  )
}
