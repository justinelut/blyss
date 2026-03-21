'use client'

import { Subscription } from '@polar-sh/sdk'
import { CheckCircle } from 'lucide-react'

interface SubscriptionTiersProps {
  subscriptions: Subscription[]
}

export function SubscriptionTiers({ subscriptions }: SubscriptionTiersProps) {
  if (subscriptions.length === 0) return null

  return (
    <section className="mt-12 bg-surface-container-low py-20">
      <div className="mx-auto max-w-screen-xl px-8">
        <div className="mb-12 flex flex-col items-baseline justify-between gap-4 md:flex-row">
          <h2 className="font-headline text-4xl font-bold tracking-tight">
            Become a Patron
          </h2>
          <p className="text-on-surface-variant">
            Support the craft and unlock exclusive assets.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {subscriptions.slice(0, 3).map((subscription, index) => {
            const isFeatured = index === 1
            const price = subscription.subscription_product_prices?.[0]

            return (
              <div
                key={subscription.id}
                className={`flex flex-col rounded-xl bg-surface-container-lowest p-8 transition-all duration-300 hover:scale-[1.02] ${
                  isFeatured ? 'relative shadow-2xl shadow-primary/5 ring-2 ring-primary' : ''
                }`}
              >
                {isFeatured && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-black uppercase tracking-widest text-on-primary shadow-lg">
                    Most Popular
                  </div>
                )}
                <div className="mb-6">
                  <span className="rounded-full bg-tertiary-fixed px-3 py-1 text-xs font-bold uppercase tracking-widest text-on-tertiary-fixed">
                    {subscription.name}
                  </span>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="font-headline text-4xl font-black">
                      ${price ? (price.price_amount / 100).toFixed(0) : '0'}
                    </span>
                    <span className="text-on-surface-variant">/mo</span>
                  </div>
                </div>
                <ul className="mb-10 flex-1 space-y-4">
                  <li className="flex items-start gap-3 text-on-surface-variant">
                    <CheckCircle className="mt-1 text-secondary" size={16} />
                    Access to exclusive content
                  </li>
                  <li className="flex items-start gap-3 text-on-surface-variant">
                    <CheckCircle className="mt-1 text-secondary" size={16} />
                    Monthly curated assets
                  </li>
                  <li className="flex items-start gap-3 text-on-surface-variant">
                    <CheckCircle className="mt-1 text-secondary" size={16} />
                    Early access to new releases
                  </li>
                </ul>
                <button
                  className={`w-full rounded-lg py-4 font-bold transition-colors ${
                    isFeatured
                      ? 'bg-primary text-on-primary shadow-lg hover:bg-primary-container'
                      : 'bg-surface-container-high text-on-surface hover:bg-outline-variant/30'
                  }`}
                >
                  Join Now
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
