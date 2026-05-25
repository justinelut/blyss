import { BlyssWishlistPage } from '@/components/Wishlist/BlyssWishlistPage'
import { getAuthenticatedUser } from '@/utils/user'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Wishlist · Blyss',
  description: 'Items you saved on Blyss.',
  robots: { index: false, follow: false },
}

export default async function Wishlist() {
  const user = await getAuthenticatedUser()
  if (!user) redirect('/login?return_to=/wishlist')

  return (
    <div className="bg-[var(--background)] pt-20 text-[var(--text-primary)]">
      <BlyssWishlistPage />
    </div>
  )
}
