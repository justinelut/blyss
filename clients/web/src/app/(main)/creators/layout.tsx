import { PropsWithChildren } from 'react'
import { MarketplaceHeader } from '@/components/Marketplace/MarketplaceHeader'
import { MarketplaceFooter } from '@/components/Marketplace/MarketplaceFooter'

/**
 * Layout for /creators/* — wraps the directory and individual storefronts
 * with the marketplace chrome (sticky header + editorial footer).
 *
 * Per plan §6.14 the creator routes belong to the marketplace surface and
 * therefore inherit the same nav. We add `pt-20` so content starts below
 * the 80px-tall fixed MarketplaceHeader, matching the home page layout
 * pattern at (main)/(website)/(landing)/layout.tsx.
 */
export default function CreatorsLayout({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--text-primary)]">
      <MarketplaceHeader />
      <main className="flex-1 pt-20">{children}</main>
      <MarketplaceFooter />
    </div>
  )
}
