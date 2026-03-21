import { useCart } from '@/hooks/queries/cart'
import { ShoppingCart } from 'lucide-react'
import Link from 'next/link'

export const CartIcon = () => {
  const { data: cart } = useCart()
  const itemCount = cart?.item_count ?? 0

  return (
    <Link
      href="/cart"
      className="dark:text-polar-400 dark:hover:text-polar-50 relative inline-flex items-center justify-center p-2 text-gray-700 transition-colors hover:text-gray-900"
      aria-label={`Shopping cart with ${itemCount} items`}
    >
      <ShoppingCart className="h-5 w-5" />
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </Link>
  )
}
