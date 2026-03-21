'use client'

import { NewsletterSubscriptionForm } from '@/components/Newsletter/NewsletterSubscriptionForm'
import { schemas } from '@/lib/api'
import { useState } from 'react'
import { StorefrontHero } from './StorefrontHero'
import { StorefrontTabs } from './StorefrontTabs'
import { TabContent } from './TabContent'

interface StorefrontLayoutProps {
  creator: schemas['CreatorStorefrontSchema']
  activeTab: string
}

export const StorefrontLayout = ({
  creator,
  activeTab: initialTab,
}: StorefrontLayoutProps) => {
  const [activeTab, setActiveTab] = useState(initialTab)

  return (
    <div className="bg-surface min-h-screen">
      {/* Hero Banner */}
      <StorefrontHero creator={creator} />

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-12">
          {/* Tabs */}
          <StorefrontTabs activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Tab Content */}
          <TabContent creator={creator} activeTab={activeTab} />

          {/* Newsletter */}
          <div className="bg-surface-container-low shadow-editorial rounded-2xl p-8">
            <NewsletterSubscriptionForm organizationId={creator.id} />
          </div>
        </div>
      </div>
    </div>
  )
}
