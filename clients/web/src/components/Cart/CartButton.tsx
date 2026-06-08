'use client'

import { useState } from 'react'
import { FiShoppingBag } from 'react-icons/fi'
import { motion, useReducedMotion, AnimatePresence } from 'motion/react'
import {
  useCartGrouped,
  useCartForOrganization,
} from '@/hooks/queries/cart'
import { useAuth } from '@/hooks/auth'
import { CartDrawer } from './CartDrawer'
import { cn } from '@/lib/utils'

interface CartButtonProps {
  className?: string
  /**
   * Scope:
   *   - undefined → marketplace (default): badge counts items across
   *     ALL creators' carts
   *   - { organizationId } → creator-storefront: badge counts only
   *     that creator's items
   * Same prop is forwarded to CartDrawer so click-to-open keeps the
   * scope consistent.
   */
  scope?: 'marketplace' | { organizationId: string }
}

/**
 * CartButton — header cart icon with item count badge.
 *
 * In the marketplace context (default) the badge sums items across
 * every creator's cart. On a creator's storefront the badge shows only
 * that creator's count. Click opens CartDrawer with matching scope.
 */
export const CartButton = ({ className, scope = 'marketplace' }: CartButtonProps) => {
  const [open, setOpen] = useState(false)
  const reduce = useReducedMotion()
  const { authenticated } = useAuth()

  const groupedQuery = useCartGrouped(
    authenticated && scope === 'marketplace',
  )
  const scopedQuery = useCartForOrganization(
    typeof scope === 'object' ? scope.organizationId : undefined,
    authenticated && typeof scope === 'object',
  )

  const count =
    scope === 'marketplace'
      ? groupedQuery.data?.item_count ?? 0
      : (scopedQuery.data as any)?.item_count ?? 0

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Cart (${count} items)`}
        className={cn(
          'relative flex h-10 w-10 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]',
          className,
        )}
      >
        <FiShoppingBag size={20} />

        <AnimatePresence>
          {count > 0 && (
            <motion.span
              key={count}
              initial={reduce ? false : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={reduce ? undefined : { scale: 0, opacity: 0 }}
              transition={{
                duration: 0.25,
                ease: [0.32, 0.72, 0, 1],
                scale: { type: 'spring', stiffness: 500, damping: 28 },
              }}
              className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--accent)] px-1 font-sans text-[10px] font-semibold tabular-nums text-[var(--accent-foreground)]"
            >
              {count > 99 ? '99+' : count}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <CartDrawer open={open} onOpenChange={setOpen} scope={scope} />
    </>
  )
}
