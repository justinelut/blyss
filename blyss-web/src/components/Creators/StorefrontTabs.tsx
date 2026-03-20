'use client'

import { cn } from '@/lib/utils'
import { usePathname, useRouter } from 'next/navigation'

interface StorefrontTabsProps {
  activeTab: string
}

export const StorefrontTabs = ({ activeTab }: StorefrontTabsProps) => {
  const router = useRouter()
  const pathname = usePathname()

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'products', label: 'Products' },
    { id: 'subscriptions', label: 'Subscriptions' },
  ]

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams()
    if (tabId !== 'overview') {
      params.set('tab', tabId)
    }
    const queryString = params.toString()
    router.push(`${pathname}${queryString ? `?${queryString}` : ''}`)
  }

  return (
    <div className="border-b border-gray-200 dark:border-gray-800">
      <div className="flex gap-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              'border-b-2 px-1 py-4 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:text-gray-100',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
