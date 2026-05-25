'use client'

import { useState } from 'react'
import { ShoppingBag } from 'lucide-react'
import { motion, useReducedMotion, AnimatePresence } from 'motion/react'
import { useCart } from '@/hooks/queries/cart'
import { CartDrawer } from './CartDrawer'
import { cn } from '@/lib/utils'

interface CartButtonProps {
  className?: string
}

/**
 * CartButton — header cart icon with item count badge.
 * Opens the CartDrawer on click. Badge animates in/out as items are added.
 */
export const CartButton = ({ className }: CartButtonProps) => {
  const [open, setOpen] = useState(false)
  const reduce = useReducedMotion()
  const { data: cart } = useCart()

  const count = (cart as any)?.item_count ?? (cart as any)?.items?.length ?? 0

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
        <ShoppingBag size={20} strokeWidth={1.75} />

        {/* Item count badge */}
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

      <CartDrawer open={open} onOpenChange={setOpen} />
    </>
  )
}
