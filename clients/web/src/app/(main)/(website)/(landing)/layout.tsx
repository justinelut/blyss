import { PropsWithChildren } from 'react'
import { MarketplaceHeader } from '@/components/Marketplace/MarketplaceHeader'
import { MarketplaceFooter } from '@/components/Marketplace/MarketplaceFooter'

/**
 * Marketplace layout — wraps every public marketplace page with the sticky
 * header (BlyssLogo + nav + cart/sign-in) and the editorial footer.
 *
 * Per plan §3.4 + §6.1: header is fixed at top with backdrop-blur on scroll;
 * we add 80px top padding so content starts below it.
 */
export default function Layout({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--text-primary)]">
      <MarketplaceHeader />
      <main className="flex-1 pt-20">{children}</main>
      <MarketplaceFooter />
    </div>
  )
}
