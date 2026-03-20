import { WishlistPage } from '@/components/Wishlist/WishlistPage'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Wishlist',
  description: 'View and manage your saved products',
}

export default function Wishlist() {
  return <WishlistPage />
}
