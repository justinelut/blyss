'use client'

interface FilterTab {
  id: string
  label: string
}

interface FilterTabsProps {
  tabs: FilterTab[]
  activeTab: string
  onTabChange: (tabId: string) => void
}

export function FilterTabs({ tabs, activeTab, onTabChange }: FilterTabsProps) {
  return (
    <div className="flex gap-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`text-xs font-black uppercase tracking-widest transition-colors ${
            activeTab === tab.id
              ? 'border-b-2 border-primary pb-1 text-primary'
              : 'text-on-surface-variant hover:text-primary'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
