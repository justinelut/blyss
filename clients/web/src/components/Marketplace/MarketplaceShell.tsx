import { headers } from 'next/headers'
import { PropsWithChildren } from 'react'
import { MarketplaceHeader } from './MarketplaceHeader'
import { MarketplaceFooter } from './MarketplaceFooter'
import { CurrencyProvider } from './CurrencyProvider'
import { MarketplaceMobileNav } from './MarketplaceMobileNav'
import { Toaster } from '@/components/Toast/Toaster'
import { getServerGeo } from '@/lib/geo/server'

/**
 * Paths that DO NOT get the marketplace chrome — they have their own layout
 * (dashboard sidebar, hosted checkout shell, OAuth flow, etc.).
 *
 * Auth pages are also excluded: they have their own minimal centered layout
 * and don't want a header (the marketplace header would push the form
 * below the fold + duplicate the brand mark). /login, /signup,
 * /verify-email and the customer-portal magic-link flow all qualify.
 */
const NO_CHROME_PREFIXES = [
  '/dashboard',
  '/finance',
  '/settings',
  '/oauth2',
  '/onboarding',
  '/checkout/', // /checkout/[clientSecret] — hosted Paystack checkout has its own shell
  '/_buy', // host-rewritten buy.blyss.co.ke
  '/_my', // host-rewritten my.blyss.co.ke
  // Auth surfaces (no chrome)
  '/login',
  '/signup',
  '/verify-email',
  // Customer portal flow on (main)/[org]/portal/* — the auth steps
  // (start + authenticate) deserve a clean centered layout. Note this
  // also matches storefront paths starting with /portal — but storefronts
  // use the [organization] segment so that's covered by the leading slug,
  // not /portal directly.
  '/portal/authenticate',
]

export async function MarketplaceShell({ children }: PropsWithChildren) {
  // Read the pathname injected by proxy.ts middleware.
  const h = await headers()
  const pathname = h.get('x-blyss-pathname') ?? ''
  // Most NO_CHROME entries are leading-prefix matches. The customer-portal
  // authenticate page sits at /{org-slug}/portal/authenticate (or
  // /portal/authenticate when host-rewritten), so we also accept a substring
  // match for that one specific path. Anywhere else "/portal/" appears as
  // a prefix of a creator's storefront path it's intentional — only the
  // /portal/authenticate magic-link page wants the bare layout.
  //
  // Creator storefronts (/creators/{slug}) also drop the main Blyss
  // header so the page reads as the creator's own — they bring their
  // own StorefrontHero with their avatar/banner. The /creators
  // directory itself (no trailing slug) keeps the chrome since it's a
  // Blyss-curated index.
  const isCreatorStorefront =
    /^(?:\/[a-z]{2})?\/creators\/[^/]+\/?$/.test(pathname)
  const skipChrome =
    NO_CHROME_PREFIXES.some((p) => pathname.startsWith(p)) ||
    pathname.includes('/portal/authenticate') ||
    isCreatorStorefront

  if (skipChrome) {
    return <>{children}</>
  }

  const { country, currency } = await getServerGeo()

  return (
    <CurrencyProvider initialCountry={country} initialCurrency={currency}>
      <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--text-primary)]">
        <MarketplaceHeader />
        {/* pb-20 lg:pb-0 reserves space on mobile so the fixed
            MarketplaceMobileNav doesn't cover scrollable content. */}
        <main className="flex-1 pt-20 pb-20 lg:pb-0">{children}</main>
        <MarketplaceFooter />
      </div>
      <MarketplaceMobileNav />
      {/* Marketplace-surface toast viewport. Singleton store under the hood
          (use-toast.ts) so any client component can call toast() and have
          it render here — wishlist-save confirmations, error toasts, etc. */}
      <Toaster />
    </CurrencyProvider>
  )
}
