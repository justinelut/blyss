import { Toaster } from '@/components/Toast/Toaster'
import { getAuthenticatedUser } from '@/utils/user'
import { redirect } from 'next/navigation'
import { Navigation } from './Navigation'

export const dynamic = 'force-dynamic'

/**
 * Marketplace-level customer portal layout.
 *
 * Polar's per-org portal at /{slug}/portal/* uses customer-session-
 * tokens via magic-link emails. Blyss now runs ONE portal at /portal/*
 * for the buyer's whole purchase history across creators, authenticated
 * via the standard WebUser session (no token in URL, no per-org
 * branding in the chrome).
 *
 * Per-org portal at /{slug}/portal/* is kept ONLY as the magic-link
 * landing for guest buyers who never made a Blyss account — they get
 * a token in their order email and are redirected to /portal once they
 * sign up. All in-product navigation now points at /portal.
 */
export default async function Layout(props: { children: React.ReactNode }) {
  const user = await getAuthenticatedUser()
  if (!user) {
    redirect('/login?return_to=/portal/overview')
  }

  return (
    <div className="flex min-h-screen grow flex-col">
      <div className="flex w-full flex-col items-stretch gap-6 px-4 py-8 md:mx-auto md:max-w-5xl md:flex-row md:gap-12 lg:px-0">
        <Navigation user={user} />
        <div className="flex w-full flex-col md:py-12">{props.children}</div>
      </div>
      <Toaster />
    </div>
  )
}
