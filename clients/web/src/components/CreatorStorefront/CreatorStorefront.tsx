'use client'

import { useState } from 'react'
import { Organization, Product, Subscription } from '@polar-sh/sdk'
import { HeroBanner } from './HeroBanner'
import { ProfileHeader } from './ProfileHeader'
import { TabsNavigation } from './TabsNavigation'
import { SubscriptionTiers } from './SubscriptionTiers'
import { ProductsGrid } from './ProductsGrid'
import { ReviewSection } from './ReviewSection'

interface CreatorStorefrontProps {
  organization: Organization
  products: Product[]
  subscriptions: Subscription[]
}

const TABS = [
  { id: 'products', label: 'Products' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'about', label: 'About' },
]

export function CreatorStorefront({
  organization,
  products,
  subscriptions,
}: CreatorStorefrontProps) {
  const [activeTab, setActiveTab] = useState('products')

  return (
    <div className="min-h-screen bg-background font-body text-on-surface">
      <main className="pt-20">
        {/* Hero Banner */}
        <HeroBanner
          coverImage={organization.profile_settings?.cover_picture_url}
          organizationName={organization.name}
        />

        {/* Profile Header */}
        <ProfileHeader organization={organization} products={products} />

        {/* Tabs Navigation */}
        <TabsNavigation tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Subscriptions Section */}
        {subscriptions.length > 0 && <SubscriptionTiers subscriptions={subscriptions} />}

        {/* Products Grid */}
        {activeTab === 'products' && <ProductsGrid products={products} />}

        {/* Review Section */}
        {activeTab === 'reviews' && <ReviewSection />}

        {/* About Section */}
        {activeTab === 'about' && (
          <section className="mx-auto max-w-screen-xl px-8 py-24">
            <h2 className="mb-6 font-headline text-4xl font-bold">About</h2>
            <p className="max-w-3xl text-xl leading-relaxed text-on-surface-variant">
              {organization.bio || 'No additional information available.'}
            </p>
          </section>
        )}
      </main>
    </div>
  )
}
