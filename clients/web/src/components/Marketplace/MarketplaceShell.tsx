import { headers } from 'next/headers'
import { PropsWithChildren } from 'react'
import { MarketplaceHeader } from './MarketplaceHeader'
import { MarketplaceFooter } from './MarketplaceFooter'
import { CurrencyProvider } from './CurrencyProvider'
import { Toaster } from '@/components/Toast/Toaster'
import { getServerGeo } from '@/lib/geo/server'

/**
 * Paths that DO NOT get the marketplace chrome — they have their own layout
 * (dashboard sidebar, hosted checkout shell, OAuth flow, etc.).
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
]

export async function MarketplaceShell({ children }: PropsWithChildren) {
  // Read the pathname injected by proxy.ts middleware.
  const h = await headers()
  const pathname = h.get('x-blyss-pathname') ?? ''
  const skipChrome = NO_CHROME_PREFIXES.some((p) => pathname.startsWith(p))

  if (skipChrome) {
    return <>{children}</>
  }

  const { country, currency } = await getServerGeo()

  return (
    <CurrencyProvider initialCountry={country} initialCurrency={currency}>
      <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--text-primary)]">
        <MarketplaceHeader />
        <main className="flex-1 pt-20">{children}</main>
        <MarketplaceFooter />
      </div>
      {/* Marketplace-surface toast viewport. Singleton store under the hood
          (use-toast.ts) so any client component can call toast() and have
          it render here — wishlist-save confirmations, error toasts, etc. */}
      <Toaster />
    </CurrencyProvider>
  )
}
