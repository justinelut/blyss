'use client'

import Link from 'next/link'
import { FiUser } from 'react-icons/fi'
import { CartButton } from '@/components/Cart/CartButton'

export interface StorefrontActionBarProps {
  /** Creator slug — links the account icon to /{slug}/portal. */
  slug: string
  /** Organization id — scopes the cart badge to this creator. */
  organizationId: string
}

/**
 * StorefrontActionBar — the cart + account controls, rendered inside the
 * sticky StorefrontTabs bar's right edge.
 *
 * The hero renders its own cart/account cluster over the banner; that one
 * scrolls away with the hero. Once the tabs bar locks to the top
 * (position: sticky, top-0), this cluster rides along with it so the buyer
 * always has the cart and their account within reach — no separate floating
 * pill that would collide with the full-width tabs bar.
 */
export const StorefrontActionBar = ({
  slug,
  organizationId,
}: StorefrontActionBarProps) => {
  return (
    <div className="flex items-center gap-0.5">
      <Link
        href={`/${slug}/portal`}
        aria-label="Your purchases with this creator"
        className="flex h-10 w-10 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]"
      >
        <FiUser size={18} aria-hidden="true" />
      </Link>
      <CartButton
        scope={{ organizationId }}
        className="text-[var(--text-secondary)]"
      />
    </div>
  )
}
