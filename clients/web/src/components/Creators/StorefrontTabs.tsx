'use client'

import { cn } from '@polar-sh/ui/lib/utils'

interface StorefrontTabsProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export const StorefrontTabs = ({
  activeTab,
  onTabChange,
}: StorefrontTabsProps) => {
  const tabs = [
    { id: 'products', label: 'Products' },
    { id: 'subscriptions', label: 'Subscriptions' },
    { id: 'about', label: 'About' },
  ]

  return (
    <div className="border-outline-variant/15 border-b">
      <div className="flex gap-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'font-epilogue border-b-2 px-1 py-4 text-base font-medium transition-colors',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'text-on-surface-variant hover:text-on-surface border-transparent',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
