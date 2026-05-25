import { redirect } from 'next/navigation'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Start selling · Blyss',
  description: 'Set up your storefront in 10 minutes. M-Pesa or card payouts.',
}

/**
 * /start — redirects to Polar's existing creator onboarding.
 * The onboarding flow at /dashboard/create handles org creation,
 * and the dashboard checklist handles the remaining setup steps.
 */
export default function StartPage() {
  redirect('/dashboard/create')
}
