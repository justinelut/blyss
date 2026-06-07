import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAuthenticatedUser } from '@/utils/user'
import { OrdersPageClient } from './OrdersPageClient'

export const metadata: Metadata = {
  title: 'Your purchases · Blyss',
  description:
    'Every product you bought on Blyss, in one place. Manage downloads, subscriptions, and refunds via each creator’s portal.',
  robots: { index: false, follow: false },
}

export default async function OrdersPage() {
  const user = await getAuthenticatedUser()
  if (!user) redirect('/login?return_to=/orders')

  return <OrdersPageClient />
}
