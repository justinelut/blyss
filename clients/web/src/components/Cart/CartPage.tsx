'use client'
import Spinner from '@/components/Shared/Spinner'
import { ErrorState } from '@/components/Shared/ErrorState'
import { useCart } from '@/hooks/queries/cart'
import { useCurrencyStore } from '@/stores/currencyStore'
import { formatCurrency } from '@polar-sh/currency'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CartItem } from './CartItem'
import { EmptyCart } from './EmptyCart'

export const CartPage = () => {
  const { data: cart, isLoading, error, refetch } = useCart()
  const { currency } = useCurrencyStore()
  const router = useRouter()

  const handleCheckout = () => {
    // TODO: Implement checkout navigation with cart items
    // This will be implemented when integrating with the checkout service
    router.push('/checkout')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12" role="status" aria-live="polite" aria-label="Loading cart">
        <Spinner />
        <span className="sr-only">Loading your shopping cart...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="font-epilogue mb-8 text-4xl font-bold tracking-tight text-[var(--color-on-surface)] dark:text-[var(--color-on-surface)]">
          Shopping Cart
        </h1>
        <ErrorState
          title="Failed to load cart"
          message="We couldn't load your shopping cart. Please try again."
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  if (!cart || cart.items.length === 0) {
    return <EmptyCart />
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="font-epilogue text-4xl font-bold tracking-tight text-[var(--color-on-surface)] dark:text-[var(--color-on-surface)]">
          Shopping Cart
        </h1>
        <Link href="/products">
          <Button variant="ghost" size="sm" className="font-inter" aria-label="Continue shopping for products">
            Continue Shopping
          </Button>
        </Link>
      </header>

      <section aria-label="Cart items">
        <div className="space-y-0 rounded-md bg-[var(--color-surface-container-lowest)] shadow-[var(--shadow-editorial)]">
          {cart.items.map((item) => (
            <CartItem key={item.id} item={item} currency={currency} />
          ))}
        </div>
      </section>

      <section aria-label="Order summary" className="mt-8 rounded-md bg-[var(--color-surface-container-low)] p-6 shadow-[var(--shadow-editorial)]">
        <div className="space-y-3">
          <div className="font-inter flex items-center justify-between text-sm">
            <span className="text-[var(--color-on-surface-variant)]">
              Subtotal
            </span>
            <span className="font-medium text-[var(--color-on-surface)]" aria-label={`Subtotal: ${formatCurrency(cart.subtotal, currency)}`}>
              {formatCurrency(cart.subtotal, currency)}
            </span>
          </div>
          <div className="font-inter flex items-center justify-between text-sm">
            <span className="text-[var(--color-on-surface-variant)]">
              Estimated Tax
            </span>
            <span className="font-medium text-[var(--color-on-surface)]" aria-label={`Estimated tax: ${formatCurrency(cart.tax, currency)}`}>
              {formatCurrency(cart.tax, currency)}
            </span>
          </div>
          <div className="border-opacity-15 border-t border-[var(--color-outline-variant)] pt-3">
            <div className="flex items-center justify-between">
              <span className="font-epilogue text-base font-semibold text-[var(--color-on-surface)]">
                Total
              </span>
              <span className="font-epilogue text-xl font-bold text-[var(--color-on-surface)]" aria-label={`Total: ${formatCurrency(cart.total, currency)}`}>
                {formatCurrency(cart.total, currency)}
              </span>
            </div>
          </div>
        </div>

        <Button onClick={handleCheckout} className="mt-6 w-full" size="lg" aria-label="Proceed to checkout">
          Proceed to Checkout
        </Button>
      </section>
    </div>
  )
}
