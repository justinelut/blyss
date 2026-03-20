'use client'
import Spinner from '@/components/Shared/Spinner'
import { useCart } from '@/hooks/queries/cart'


import { formatCurrency } from '@polar-sh/currency'
import { Button } from '@polar-sh/ui/components/ui/button'
import { useRouter } from 'next/navigation'
import { CartItem } from './CartItem'
import { EmptyCart } from './EmptyCart'

export const CartPage = () => {
  const { data: cart, isLoading, error } = useCart()
  const router = useRouter()

  const handleCheckout = () => {
    // TODO: Implement checkout navigation with cart items
    // This will be implemented when integrating with the checkout service
    router.push('/checkout')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
        <p className="text-sm text-red-800 dark:text-red-200">
          Failed to load cart. Please try again.
        </p>
      </div>
    )
  }

  if (!cart || cart.items.length === 0) {
    return <EmptyCart />
  }

  const currency = cart.items[0]?.product.prices?.[0]?.price_currency ?? 'usd'

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="dark:text-polar-50 mb-8 text-3xl font-bold text-gray-900">
        Shopping Cart
      </h1>

      <div className="space-y-0">
        {cart.items.map((item) => (
          <CartItem key={item.id} item={item} />
        ))}
      </div>

      <div className="dark:border-polar-700 dark:bg-polar-900 mt-8 rounded-lg border border-gray-200 bg-gray-50 p-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="dark:text-polar-400 text-gray-600">Subtotal</span>
            <span className="dark:text-polar-50 font-medium text-gray-900">
              {formatCurrency(cart.subtotal, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="dark:text-polar-400 text-gray-600">
              Estimated Tax
            </span>
            <span className="dark:text-polar-50 font-medium text-gray-900">
              {formatCurrency(cart.tax, currency)}
            </span>
          </div>
          <div className="dark:border-polar-700 border-t border-gray-200 pt-3">
            <div className="flex items-center justify-between">
              <span className="dark:text-polar-50 text-base font-semibold text-gray-900">
                Total
              </span>
              <span className="dark:text-polar-50 text-xl font-bold text-gray-900">
                {formatCurrency(cart.total, currency)}
              </span>
            </div>
          </div>
        </div>

        <Button onClick={handleCheckout} className="mt-6 w-full" size="lg">
          Proceed to Checkout
        </Button>
      </div>
    </div>
  )
}
