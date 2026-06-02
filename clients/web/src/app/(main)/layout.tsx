import { CookieConsent } from '@/components/Privacy/CookieConsent'
import { MarketplaceShell } from '@/components/Marketplace/MarketplaceShell'
import { headers } from 'next/headers'
import { PropsWithChildren } from 'react'
import { PolarThemeProvider } from '../providers'

export default async function Layout({ children }: PropsWithChildren) {
  const headersList = await headers()
  const countryCode = headersList.get('x-vercel-ip-country')

  return (
    <PolarThemeProvider>
      <MarketplaceShell>{children}</MarketplaceShell>
      <CookieConsent countryCode={countryCode} />
    </PolarThemeProvider>
  )
}
