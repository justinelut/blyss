'use client'

import { usePathname } from 'next/navigation'
import { PropsWithChildren } from 'react'
import { MarketplaceHeader } from './MarketplaceHeader'
import { MarketplaceFooter } from './MarketplaceFooter'
import { MarketplaceMobileNav } from './MarketplaceMobileNav'

/**
 * Same prefix list as the server-side computation in MarketplaceShell —
 * paths that should NOT show the Blyss marketplace chrome (header,
 * footer, mobile nav).
 */
const NO_CHROME_PREFIXES = [
  '/dashboard',
  '/finance',
  '/settings',
  '/oauth2',
  '/onboarding',
  '/checkout/',
  '/_buy',
  '/_my',
  '/login',
  '/signup',
  '/verify-email',
  '/portal/authenticate',
]

const CREATOR_STOREFRONT_RE = /^(?:\/[a-z]{2})?\/creators\/[^/]+\/?$/

/**
 * Decide whether to render the marketplace chrome based on the CURRENT
 * pathname (client-side). The server-side MarketplaceShell makes this same
 * decision from the x-blyss-pathname header but that's frozen at first
 * render — it doesn't re-evaluate on Next.js client-side navigation, so
 * navigating from / to /creators/{slug} kept the header until a hard
 * refresh. usePathname() re-runs on every navigation, so the chrome now
 * appears/disappears correctly.
 */
export const MarketplaceChrome = ({
  children,
  initialSkipChrome,
}: PropsWithChildren<{ initialSkipChrome: boolean }>) => {
  const pathname = usePathname()

  // Compute skipChrome from the current path. On first render this matches
  // the server's initialSkipChrome (no flicker); on subsequent client
  // navigations it tracks the URL.
  const skipChrome =
    pathname === null
      ? initialSkipChrome
      : NO_CHROME_PREFIXES.some((p) => pathname.startsWith(p)) ||
        pathname.includes('/portal/authenticate') ||
        CREATOR_STOREFRONT_RE.test(pathname)

  if (skipChrome) {
    return <>{children}</>
  }

  return (
    <>
      <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--text-primary)]">
        <MarketplaceHeader />
        <main className="flex-1 pt-20 pb-20 lg:pb-0">{children}</main>
        <MarketplaceFooter />
      </div>
      <MarketplaceMobileNav />
    </>
  )
}
