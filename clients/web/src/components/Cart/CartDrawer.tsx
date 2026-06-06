'use client'

import { FiX } from 'react-icons/fi'
import { useRouter } from 'next/navigation'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet'
import { useCart, useCheckoutCart, useRemoveFromCart } from '@/hooks/queries/cart'
import { useAddToWishlist } from '@/hooks/queries/wishlist'
import { useAuth } from '@/hooks/auth'
import { CartItemRow } from './CartItemRow'
import { typography } from '@/design'
import { cn } from '@/lib/utils'

interface CartDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const fmtPrice = (cents: number, currency = 'KES') => {
  const major = cents / 100
  // Unambiguous currency labels — matches the rest of the marketplace polish.
  if (currency === 'KES') return `KSh ${major.toLocaleString('en-KE')}`
  if (currency === 'USD') return `US$ ${major.toLocaleString('en-US')}`
  return `${currency} ${major.toLocaleString()}`
}

/**
 * CartDrawer — slides in from right, 420px desktop, full-screen mobile.
 * Per plan §6.6: items list, subtotal, Checkout CTA, "View full cart" link.
 */
export const CartDrawer = ({ open, onOpenChange }: CartDrawerProps) => {
  const router = useRouter()
  const { authenticated } = useAuth()
  const { data: cart } = useCart(authenticated)
  const { mutate: removeItem, variables: removingId } = useRemoveFromCart()

  const items = (cart as any)?.items ?? []
  const subtotal = (cart as any)?.subtotal ?? 0
  const itemCount = (cart as any)?.item_count ?? items.length

  const { mutate: checkoutCart, isPending: isCheckingOut } = useCheckoutCart()
  // Etsy-style 'Save for later' flow inside the drawer: push to wishlist
  // then remove from cart on success. Same pattern as the full cart page.
  const { mutate: addToWishlist, variables: savingProductId, isPending: isSaving } =
    useAddToWishlist()

  const handleCheckout = () => {
    checkoutCart(undefined, {
      onSuccess: ({ url }) => {
        onOpenChange(false)
        router.push(url)
      },
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        hideClose
        className="flex w-full flex-col bg-[var(--background)] p-0 sm:max-w-[420px]"
      >
        {/* Header */}
        <SheetHeader className="flex flex-row items-center justify-between border-b border-[var(--border)] px-6 py-5">
          <SheetTitle className="font-display text-[18px] font-semibold text-[var(--text-primary)]">
            Your cart ({itemCount})
          </SheetTitle>
          <SheetClose asChild>
            <button
              type="button"
              aria-label="Close cart"
              className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-sunken)]"
            >
              <FiX size={20} />
            </button>
          </SheetClose>
        </SheetHeader>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-start py-16">
              <h3 className={cn(typography.h4, 'text-[var(--text-primary)]')}>
                Nothing here yet.
              </h3>
              <p className="mt-2 font-sans text-[14px] text-[var(--text-secondary)]">
                Browse the marketplace and add something you love.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {items.map((item: any) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  onRemove={(id) => removeItem({ itemId: id })}
                  isRemoving={(removingId as any)?.itemId === item.id}
                  onSaveForLater={(it) => {
                    addToWishlist(it.product.id, {
                      onSuccess: () => removeItem({ itemId: it.id }),
                    })
                  }}
                  isSaving={savingProductId === item.product.id && isSaving}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer — subtotal + CTAs */}
        {items.length > 0 && (
          <div className="border-t border-[var(--border)] px-6 py-5">
            <div className="flex items-center justify-between">
              <span className="font-sans text-[14px] text-[var(--text-secondary)]">
                Subtotal
              </span>
              <span className="font-display text-[18px] font-semibold tabular-nums text-[var(--text-primary)]">
                {fmtPrice(subtotal)}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCheckout}
              disabled={isCheckingOut}
              className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-md bg-[var(--accent)] font-sans text-[15px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCheckingOut ? 'Starting checkout...' : 'Checkout'}
            </button>
            <button
              type="button"
              onClick={() => { onOpenChange(false); router.push('/cart') }}
              className="mt-3 inline-flex h-10 w-full items-center justify-center font-sans text-[13px] text-[var(--text-secondary)] underline-offset-4 transition-colors hover:text-[var(--accent)] hover:underline"
            >
              View full cart
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
