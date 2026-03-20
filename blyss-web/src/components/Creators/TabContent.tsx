'use client'

import { ProductCard } from '@/components/Products/ProductCard'
import { schemas } from '@polar-sh/client'

interface TabContentProps {
  creator: schemas['CreatorStorefrontSchema']
  activeTab: string
}

export const TabContent = ({ creator, activeTab }: TabContentProps) => {
  if (activeTab === 'overview') {
    return (
      <div className="py-8">
        <h2 className="mb-4 text-xl font-semibold">About {creator.name}</h2>
        {creator.bio ? (
          <p className="text-gray-600 dark:text-gray-400">{creator.bio}</p>
        ) : (
          <p className="text-gray-500 dark:text-gray-500">
            No description available.
          </p>
        )}
      </div>
    )
  }

  if (activeTab === 'products') {
    return (
      <div className="py-8">
        <h2 className="mb-6 text-xl font-semibold">Products</h2>
        {creator.products && creator.products.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {creator.products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                organization={creator}
                currency="USD"
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-gray-500 dark:text-gray-500">
              No products available.
            </p>
          </div>
        )}
      </div>
    )
  }

  if (activeTab === 'subscriptions') {
    return (
      <div className="py-8">
        <h2 className="mb-6 text-xl font-semibold">Subscriptions</h2>
        <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-500 dark:text-gray-500">
            Subscriptions coming soon.
          </p>
        </div>
      </div>
    )
  }

  return null
}
