'use client'

import { schemas } from '@/lib/api'
import { ProductCard } from './ProductCard'

interface ProductGridProps {
  products: schemas['Product'][]
}

export function ProductGrid({ products }: ProductGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
