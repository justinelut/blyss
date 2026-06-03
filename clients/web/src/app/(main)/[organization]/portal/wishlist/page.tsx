import { Metadata } from 'next'
import { BlyssWishlistPage } from '@/components/Wishlist/BlyssWishlistPage'

export const metadata: Metadata = {
  title: 'Wishlist · Customer Portal · Blyss',
  description: 'Items you saved on Blyss.',
  robots: { index: false, follow: false },
}

export default function PortalWishlistPage() {
  return (
    <div className="flex flex-col gap-12">
      <BlyssWishlistPage />
    </div>
  )
}
