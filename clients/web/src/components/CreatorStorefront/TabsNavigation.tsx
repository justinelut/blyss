'use client'

interface Tab {
  id: string
  label: string
}

interface TabsNavigationProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
}

export function TabsNavigation({ tabs, activeTab, onTabChange }: TabsNavigationProps) {
  return (
    <section className="mx-auto mt-16 max-w-screen-xl px-8">
      <div className="no-scrollbar flex gap-10 overflow-x-auto border-b border-outline-variant/20">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`whitespace-nowrap border-b-2 px-2 pb-4 font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-primary font-bold text-primary'
                : 'border-transparent text-on-surface-variant hover:text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </section>
  )
}
