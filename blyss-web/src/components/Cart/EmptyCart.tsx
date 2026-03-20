import { Button } from '@/components/ui/button'
import { ShoppingCart } from 'lucide-react'
import Link from 'next/link'

export const EmptyCart = () => {
  return (
    <div className="dark:border-polar-700 flex flex-col items-center justify-center gap-4 rounded-3xl border border-gray-200 p-12">
      <div className="dark:text-polar-500 text-5xl text-gray-500">
        <ShoppingCart className="h-16 w-16" />
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <h3 className="dark:text-polar-50 text-lg text-gray-900">
          Your cart is empty
        </h3>
        <p className="dark:text-polar-500 text-gray-500">
          Add some products to get started
        </p>
      </div>
      <Link href="/products">
        <Button variant="default">Browse Products</Button>
      </Link>
    </div>
  )
}
