import { CartPage } from '@/components/Cart/CartPage'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Shopping Cart',
  description: 'Review and manage items in your shopping cart',
}

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-8">
      <CartPage />
    </div>
  )
}
