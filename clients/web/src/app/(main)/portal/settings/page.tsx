import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getServerURL } from '@/utils/api'
import { SettingsClient } from './SettingsClient'

export const metadata: Metadata = {
  title: 'Settings · Blyss',
  robots: { index: false, follow: false },
}

/**
 * Unified buyer profile (Blyss-as-MoR).
 *
 * Polar's data model has one Customer row per (User, creator) pair.
 * The Blyss buyer experience treats those as a single profile —
 * Blyss is the merchant of record, not each creator. The
 * /v1/me/profile endpoints aggregate read and fan-write update
 * across every Customer row this user owns.
 *
 * Payment methods are intentionally NOT shown here. Paystack does
 * not tokenize cards via Polar's pipeline — auth_codes are stored
 * on PaymentMethod rows for renewal billing only, never surfaced
 * to the buyer for direct selection. Cards are entered fresh per
 * purchase via Paystack's secure inline form.
 */
export default async function Page() {
  const cookie = (await headers()).get('cookie') || ''
  if (!cookie.includes('polar_session=')) {
    redirect('/login?return_to=/portal/settings')
  }

  const res = await fetch(`${getServerURL()}/v1/me/profile`, {
    headers: { cookie },
    cache: 'no-store',
  })

  if (!res.ok) {
    if (res.status === 401) redirect('/login?return_to=/portal/settings')
    return (
      <div className="flex flex-col gap-y-4">
        <h3 className="text-2xl">Settings</h3>
        <p className="text-[var(--text-muted)]">
          Couldn&apos;t load your profile. Please try again later.
        </p>
      </div>
    )
  }

  const profile = await res.json()

  return <SettingsClient initial={profile} />
}
