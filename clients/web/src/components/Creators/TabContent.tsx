'use client'

import { ProductCard } from '@/components/Products/ProductCard'
import { useCurrencyStore } from '@/stores/currencyStore'
import { schemas } from '@/lib/api'

interface TabContentProps {
  creator: schemas['CreatorStorefrontSchema']
  activeTab: string
}

export const TabContent = ({ creator, activeTab }: TabContentProps) => {
  const { currency } = useCurrencyStore()

  if (activeTab === 'products') {
    return (
      <div>
        <h2 className="font-epilogue text-on-surface mb-8 text-2xl font-semibold">
          Products
        </h2>
        {creator.products && creator.products.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {creator.products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                organization={creator}
                currency={currency}
              />
            ))}
          </div>
        ) : (
          <div className="bg-surface-container-low flex min-h-[300px] items-center justify-center rounded-2xl">
            <div className="text-center">
              <p className="text-on-surface-variant text-lg">
                No products available yet.
              </p>
              <p className="text-on-surface-variant mt-2 text-sm">
                Check back soon for new releases!
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (activeTab === 'subscriptions') {
    return (
      <div>
        <h2 className="font-epilogue text-on-surface mb-8 text-2xl font-semibold">
          Subscription Tiers
        </h2>
        {creator.subscriptions && creator.subscriptions.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {creator.subscriptions.map((subscription) => (
              <div
                key={subscription.id}
                className="bg-surface-container-lowest shadow-editorial flex flex-col rounded-2xl p-6"
              >
                <h3 className="font-epilogue text-on-surface text-xl font-semibold">
                  {subscription.name}
                </h3>
                {subscription.description && (
                  <p className="text-on-surface-variant mt-2 text-sm">
                    {subscription.description}
                  </p>
                )}
                {subscription.prices && subscription.prices.length > 0 && (
                  <div className="mt-4">
                    <span className="font-epilogue text-on-surface text-3xl font-bold">
                      {subscription.prices[0].price_currency.toUpperCase()}{' '}
                      {(subscription.prices[0].price_amount / 100).toFixed(2)}
                    </span>
                    <span className="text-on-surface-variant text-sm">
                      /{subscription.prices[0].recurring_interval}
                    </span>
                  </div>
                )}
                {subscription.benefits && subscription.benefits.length > 0 && (
                  <ul className="mt-6 space-y-2">
                    {subscription.benefits.map((benefit, index) => (
                      <li
                        key={index}
                        className="text-on-surface-variant flex items-start text-sm"
                      >
                        <span className="text-primary mr-2">✓</span>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-surface-container-low flex min-h-[300px] items-center justify-center rounded-2xl">
            <div className="text-center">
              <p className="text-on-surface-variant text-lg">
                No subscription tiers available yet.
              </p>
              <p className="text-on-surface-variant mt-2 text-sm">
                Check back soon for membership options!
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (activeTab === 'about') {
    return (
      <div>
        <h2 className="font-epilogue text-on-surface mb-8 text-2xl font-semibold">
          About {creator.name}
        </h2>
        <div className="bg-surface-container-lowest shadow-editorial rounded-2xl p-8">
          {creator.bio ? (
            <p className="text-on-surface text-base leading-relaxed whitespace-pre-wrap">
              {creator.bio}
            </p>
          ) : (
            <p className="text-on-surface-variant text-center">
              No description available.
            </p>
          )}
        </div>
      </div>
    )
  }

  return null
}
