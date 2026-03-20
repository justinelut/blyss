'use client'

import { ProductCard } from '@/components/Products/ProductCard'
import { useRelatedProducts } from '@/hooks/queries/products'
import { schemas } from '@/lib/api'

interface RelatedProductsProps {
  productId: string
  currentOrganization: schemas['Organization']
  currency: string
}

export const RelatedProducts = ({
  productId,
  currentOrganization,
  currency,
}: RelatedProductsProps) => {
  const { data: relatedProducts, isLoading } = useRelatedProducts(productId, 4)

  if (isLoading) {
    return (
      <div className="mt-12">
        <h2 className="mb-6 text-2xl font-semibold">Related Products</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-96 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800"
            />
          ))}
        </div>
      </div>
    )
  }

  if (!relatedProducts || relatedProducts.items.length === 0) {
    return null
  }

  return (
    <div className="mt-12">
      <h2 className="mb-6 text-2xl font-semibold">Related Products</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {relatedProducts.items.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            organization={currentOrganization}
            currency={currency}
          />
        ))}
      </div>
    </div>
  )
}
