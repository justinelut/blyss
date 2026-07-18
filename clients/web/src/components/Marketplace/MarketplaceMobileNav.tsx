'use client'

/* Hallmark · component: mobile bottom nav · genre: editorial
 * Three-item bottom bar — Browse · Wishlist · Cart.
 *
 * No "Account" icon: Blyss doesn't aggregate purchases at the
 * marketplace level. Buyers manage purchases per-creator on Polar's
 * native portal accessed via the creator's storefront page (or via
 * the link in their order-confirmation email). Sign-in for guests
 * remains accessible from the marketplace header.
 *
 * Hidden on lg+ where the desktop header carries every affordance,
 * and on the PDP route where the MobileBuyBar owns the fixed-bottom
 * slot.
 */

import Link from './LocaleLink'
import { usePathname } from 'next/navigation'
import { FiCompass, FiHeart, FiShoppingBag } from 'react-icons/fi'
import { useAuth } from '@/hooks/auth'
import { useCart } from '@/hooks/queries/cart'
import { useWishlist } from '@/hooks/queries/wishlist'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: typeof FiCompass
  /** Only render when authenticated (e.g. wishlist). */
  authOnly?: boolean
  /** Counter source: 'cart' | 'wishlist' | undefined. */
  counter?: 'cart' | 'wishlist'
}

const ITEMS: NavItem[] = [
  { href: '/marketplace', label: 'Browse', icon: FiCompass },
  {
    href: '/wishlist',
    label: 'Wishlist',
    icon: FiHeart,
    authOnly: true,
    counter: 'wishlist',
  },
  {
    href: '/cart',
    label: 'Cart',
    icon: FiShoppingBag,
    counter: 'cart',
  },
]

export function MarketplaceMobileNav() {
  const pathname = usePathname() ?? ''
  const { authenticated } = useAuth()
  const { data: cart } = useCart(authenticated)
  const { data: wishlist } = useWishlist(authenticated)

  // PDP and donation routes already own the fixed-bottom slot via their
  // own sticky CTA bar. Stacking another bar would crowd the viewport.
  const isPDP = /^\/[a-z]{2}\/product\/|^\/product\//.test(pathname)
  const isDonation = /^\/[a-z]{2}\/donation\/|^\/donation\//.test(pathname)
  if (isPDP || isDonation) return null

  const items = ITEMS.filter((item) => !item.authOnly || authenticated)

  const isActive = (href: string) => {
    if (href === '/marketplace') {
      return /\/(marketplace|creators|search|category|products?)\b/.test(
        pathname,
      )
    }
    return pathname.includes(href)
  }

  const counts: Record<string, number> = {
    cart: ((cart as { item_count?: number } | undefined)?.item_count) ?? 0,
    wishlist:
      ((wishlist as { item_count?: number } | undefined)?.item_count) ?? 0,
  }

  return (
    <nav
      aria-label="Marketplace mobile navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-[1280px] items-stretch justify-around">
        {items.map((item) => {
          const active = isActive(item.href)
          const count = item.counter ? counts[item.counter] || 0 : 0
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 px-2 py-2.5 transition-colors',
                  active
                    ? 'text-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                )}
              >
                <span className="relative inline-flex">
                  <item.icon size={20} aria-hidden="true" />
                  {count > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-1.5 -right-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 font-sans text-[10px] font-medium tabular-nums text-[var(--accent-foreground)]"
                    >
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </span>
                <span className="font-sans text-[10px] font-medium uppercase tracking-[0.06em]">
                  {item.label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
