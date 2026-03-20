'use client'

import { NewsletterSubscriptionForm } from '@/components/Newsletter/NewsletterSubscriptionForm'
import { schemas } from '@polar-sh/client'
import { StorefrontSidebar } from './StorefrontSidebar'
import { StorefrontTabs } from './StorefrontTabs'
import { TabContent } from './TabContent'

interface StorefrontLayoutProps {
  creator: schemas['CreatorStorefrontSchema']
  activeTab: string
}

export const StorefrontLayout = ({
  creator,
  activeTab,
}: StorefrontLayoutProps) => {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8 lg:flex-row">
        <StorefrontSidebar creator={creator} />

        <div className="flex-1">
          <StorefrontTabs activeTab={activeTab} />
          <TabContent creator={creator} activeTab={activeTab} />

          <div className="mt-12">
            <NewsletterSubscriptionForm organizationId={creator.id} />
          </div>
        </div>
      </div>
    </div>
  )
}
