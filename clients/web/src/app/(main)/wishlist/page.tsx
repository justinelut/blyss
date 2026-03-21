import { WishlistPage } from '@/components/Wishlist/WishlistPage'
import { getAuthenticatedUser } from '@/utils/user'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'My Wishlist',
  description: 'View and manage your saved products',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function Wishlist() {
  // Server-side authentication check
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect('/login?return_to=/wishlist')
  }

  return <WishlistPage />
}
