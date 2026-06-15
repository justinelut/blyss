import { CartPage } from '@/components/Cart/CartPage'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Your cart',
  description: 'Review items in your cart before checkout.',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <CartPage />
}
