'use client'

import { cn } from '@/lib/utils'

export type StorefrontTabId = 'work' | 'subscriptions' | 'about'

export interface StorefrontTab {
  id: StorefrontTabId
  label: string
  /** Optional small numeric counter shown after the label (e.g. "All work · 24") */
  count?: number
  /** When false, the tab is rendered disabled with reduced opacity. Used to
   *  show users a tab exists but has no content (e.g. no subscriptions). */
  disabled?: boolean
}

export interface StorefrontTabsProps {
  tabs: StorefrontTab[]
  /** Currently active tab id. */
  active: StorefrontTabId
  /** Notified when a non-disabled tab is clicked. */
  onChange: (next: StorefrontTabId) => void
  /** Optional right-aligned slot — used for the cart + account cluster so
   *  those controls ride along with the sticky bar instead of scrolling
   *  away with the hero. */
  actions?: React.ReactNode
  className?: string
}

/**
 * StorefrontTabs — the sticky tab strip beneath the hero.
 *
 * Per plan/07-pages.md §6.4 step 2:
 * - Tabs: All work / Subscriptions / About (Wishlist tab folded into "save
 *   creator" CTA on the hero — saved searches per-creator depend on phase 7
 *   wiring; rendering an empty third tab adds noise without value).
 * - On scroll, sticky at the top — sticks under the marketplace header
 *   (header height = 80px, so `top: 80px`).
 *
 * Underline pattern matches the editorial peers (Bandcamp creator pages, Mr
 * Porter PDP tabs): a 1px hairline track with a 2px accent underline on the
 * active tab. NO drop shadow, NO pill backgrounds — those read as billing
 * dashboards (§3.5 anti-pattern).
 *
 * The component is rendered inside a `position: sticky` wrapper by the
 * orchestrator so the hero scroll-reveals first and the tabs lock in place.
 */
export const StorefrontTabs = ({
  tabs,
  active,
  onChange,
  actions,
  className,
}: StorefrontTabsProps) => {
  return (
    <div
      className={cn(
        // Sticky to the very top — the creator storefront route
        // suppresses the main marketplace header (MarketplaceShell
        // matches /creators/{slug} and skips chrome), so the tabs
        // claim the top slot. top-0 on both mobile and desktop;
        // previously sat at top-20 to clear an 80px header that
        // no longer renders here.
        'sticky top-0 z-30',
        // Translucent backdrop with blur matches the rest of the
        // marketplace surfaces.
        'bg-[var(--background)]/95 backdrop-blur-xl',
        // Hairline at bottom defines the tab track
        'border-b border-[var(--border)]',
        className,
      )}
    >
      <div className="mx-auto flex max-w-[1280px] items-center gap-4 px-6 md:px-16">
        <nav
          aria-label="Storefront sections"
          className="-mx-6 flex-1 overflow-x-auto px-6 md:mx-0 md:px-0"
        >
          <div className="flex min-w-max items-center gap-2 md:gap-1">
            {tabs.map((tab) => {
              const isActive = tab.id === active
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`storefront-panel-${tab.id}`}
                  id={`storefront-tab-${tab.id}`}
                  disabled={tab.disabled}
                  onClick={() => !tab.disabled && onChange(tab.id)}
                  className={cn(
                    'group relative inline-flex h-14 shrink-0 items-center justify-center gap-2 px-4 font-sans text-[14px] font-medium transition-colors md:px-5',
                    isActive
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                    tab.disabled && 'cursor-not-allowed opacity-40',
                  )}
                >
                  <span>{tab.label}</span>
                  {typeof tab.count === 'number' && (
                    <span className="font-sans text-[12px] tabular-nums text-[var(--text-muted)]">
                      {tab.count}
                    </span>
                  )}
                  {/* Active underline — sits flush with the section's bottom
                      border so the hairline doubles as the unselected track */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute inset-x-3 bottom-0 h-[2px] rounded-full transition-colors md:inset-x-4',
                      isActive
                        ? 'bg-[var(--accent)]'
                        : 'bg-transparent group-hover:bg-[var(--border-strong)]',
                    )}
                  />
                </button>
              )
            })}
          </div>
        </nav>
        {actions && (
          <div className="flex shrink-0 items-center">{actions}</div>
        )}
      </div>
    </div>
  )
}
