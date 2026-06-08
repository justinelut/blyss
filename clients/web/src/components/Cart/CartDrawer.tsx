'use client'

import { FiX } from 'react-icons/fi'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet'
import {
  useCartGrouped,
  useCartForOrganization,
  useCheckoutCartForOrganization,
  useRemoveFromCart,
} from '@/hooks/queries/cart'
import { useAddToWishlist } from '@/hooks/queries/wishlist'
import { useAuth } from '@/hooks/auth'
import { CartItemRow } from './CartItemRow'
import { typography } from '@/design'
import { cn } from '@/lib/utils'

interface CartDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Scope:
   *   - 'marketplace' (default) → renders all the buyer's per-creator
   *     carts as separate sections, each with its own "Pay {Creator}"
   *     button. Used on homepage / browse / search / product pages.
   *   - { organizationId } → renders only that creator's items. Used
   *     on creator-storefront pages so the buyer sees their cart with
   *     that creator + a footer link to the full marketplace cart if
   *     they have items elsewhere.
   */
  scope?: 'marketplace' | { organizationId: string }
}

const fmtPrice = (cents: number, currency = 'KES') => {
  const major = cents / 100
  if (currency === 'KES') return `KSh ${major.toLocaleString('en-KE')}`
  if (currency === 'USD') return `US$ ${major.toLocaleString('en-US')}`
  return `${currency} ${major.toLocaleString()}`
}

export const CartDrawer = ({
  open,
  onOpenChange,
  scope = 'marketplace',
}: CartDrawerProps) => {
  if (scope === 'marketplace') {
    return <MarketplaceCartDrawer open={open} onOpenChange={onOpenChange} />
  }
  return (
    <CreatorCartDrawer
      open={open}
      onOpenChange={onOpenChange}
      organizationId={scope.organizationId}
    />
  )
}

// ── Marketplace mode: per-creator sections ──────────────────────────

const MarketplaceCartDrawer = ({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) => {
  const router = useRouter()
  const { authenticated } = useAuth()
  const { data: cart } = useCartGrouped(authenticated)
  const { mutate: removeItem, variables: removingId } = useRemoveFromCart()
  const { mutate: checkoutForOrg, isPending: isCheckingOut } =
    useCheckoutCartForOrganization()
  const { mutate: addToWishlist, variables: savingProductId, isPending: isSaving } =
    useAddToWishlist()

  const groups = cart?.groups ?? []
  const itemCount = cart?.item_count ?? 0

  const handleCheckoutCreator = (organizationId: string) => {
    checkoutForOrg(organizationId, {
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
        <SheetHeader className="flex flex-row items-center justify-between border-b border-[var(--border)] px-6 py-5">
          <SheetTitle className="font-display text-[18px] font-semibold text-[var(--text-primary)]">
            Your purchases ({itemCount})
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

        <div className="flex-1 overflow-y-auto">
          {groups.length === 0 ? (
            <div className="flex flex-col items-start px-6 py-16">
              <h3 className={cn(typography.h4, 'text-[var(--text-primary)]')}>
                Nothing here yet.
              </h3>
              <p className="mt-2 font-sans text-[14px] text-[var(--text-secondary)]">
                Browse the marketplace and add something you love.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {groups.map((group) => (
                <div key={group.organization.id} className="px-6 py-5">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      from {group.organization.name}
                    </p>
                    <span className="font-sans text-[12px] tabular-nums text-[var(--text-secondary)]">
                      {group.item_count} {group.item_count === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  <div className="divide-y divide-[var(--border)]">
                    {group.items.map((item: any) => (
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
                        isSaving={
                          savingProductId === item.product.id && isSaving
                        }
                      />
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-sans text-[13px] text-[var(--text-secondary)]">
                      Subtotal
                    </span>
                    <span className="font-display text-[15px] font-semibold tabular-nums text-[var(--text-primary)]">
                      {fmtPrice(group.subtotal)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCheckoutCreator(group.organization.id)}
                    disabled={isCheckingOut}
                    className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-md bg-[var(--accent)] font-sans text-[14px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isCheckingOut
                      ? 'Starting checkout…'
                      : `Pay ${group.organization.name}`}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {groups.length > 0 && (
          <div className="border-t border-[var(--border)] px-6 py-4">
            <button
              type="button"
              onClick={() => {
                onOpenChange(false)
                router.push('/cart')
              }}
              className="inline-flex h-10 w-full items-center justify-center font-sans text-[13px] text-[var(--text-secondary)] underline-offset-4 transition-colors hover:text-[var(--accent)] hover:underline"
            >
              View full cart
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ── Creator-scoped mode: this creator's items only ──────────────────

const CreatorCartDrawer = ({
  open,
  onOpenChange,
  organizationId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
}) => {
  const router = useRouter()
  const { authenticated } = useAuth()
  const { data: scopedCart } = useCartForOrganization(
    organizationId,
    authenticated,
  )
  // We also load the marketplace-wide grouped cart so we can surface a
  // "you also have items from N other creators" hint at the bottom.
  // Cheap because it's a separate cached query.
  const { data: grouped } = useCartGrouped(authenticated)
  const { mutate: removeItem, variables: removingId } = useRemoveFromCart()
  const { mutate: checkoutForOrg, isPending: isCheckingOut } =
    useCheckoutCartForOrganization()
  const { mutate: addToWishlist, variables: savingProductId, isPending: isSaving } =
    useAddToWishlist()

  const items = (scopedCart as any)?.items ?? []
  const subtotal = (scopedCart as any)?.subtotal ?? 0
  const itemCount = (scopedCart as any)?.item_count ?? items.length

  const otherCreatorsCount = (grouped?.groups ?? []).filter(
    (g) => g.organization.id !== organizationId && g.item_count > 0,
  ).length

  const handleCheckout = () => {
    checkoutForOrg(organizationId, {
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

        <div className="flex-1 overflow-y-auto px-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-start py-16">
              <h3 className={cn(typography.h4, 'text-[var(--text-primary)]')}>
                Nothing here yet.
              </h3>
              <p className="mt-2 font-sans text-[14px] text-[var(--text-secondary)]">
                Add a product from this creator to get started.
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
              {isCheckingOut ? 'Starting checkout…' : 'Checkout'}
            </button>
            {otherCreatorsCount > 0 && (
              <Link
                href="/cart"
                onClick={() => onOpenChange(false)}
                className="mt-3 inline-flex h-10 w-full items-center justify-center font-sans text-[13px] text-[var(--text-secondary)] underline-offset-4 transition-colors hover:text-[var(--accent)] hover:underline"
              >
                You also have items from{' '}
                {otherCreatorsCount === 1
                  ? '1 other creator'
                  : `${otherCreatorsCount} other creators`}
              </Link>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
