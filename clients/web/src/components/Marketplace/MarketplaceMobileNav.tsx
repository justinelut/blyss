'use client'

/* Hallmark · component: mobile bottom nav · genre: editorial
 * Etsy-style fixed bottom bar — Browse · Wishlist · Cart · Account.
 * Hidden on lg+ where the desktop header carries every affordance, and
 * on the PDP route where the MobileBuyBar owns the fixed-bottom slot.
 *
 * Mounted by MarketplaceShell so it appears on every public marketplace
 * route (home, /marketplace, /creators, /search, /cart, /wishlist) and
 * stays out of the dashboard / portal / oauth surfaces (those skip
 * chrome via NO_CHROME_PREFIXES).
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FiCompass, FiHeart, FiShoppingBag, FiUser } from 'react-icons/fi'
import { useAuth } from '@/hooks/auth'
import { useCart } from '@/hooks/queries/cart'
import { useWishlist } from '@/hooks/queries/wishlist'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: typeof FiCompass
  /** Only render when authenticated (e.g. wishlist, account). */
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
    authOnly: true,
    counter: 'cart',
  },
  { href: '/login', label: 'Sign in', icon: FiUser },
]

export function MarketplaceMobileNav() {
  const pathname = usePathname() ?? ''
  const { authenticated, userOrganizations } = useAuth()
  const { data: cart } = useCart(authenticated)
  const { data: wishlist } = useWishlist(authenticated)

  // PDP and donation routes already own the fixed-bottom slot via their
  // own sticky CTA bar. Stacking another bar would crowd the viewport.
  const isPDP = /^\/[a-z]{2}\/product\/|^\/product\//.test(pathname)
  const isDonation = /^\/[a-z]{2}\/donation\/|^\/donation\//.test(pathname)
  if (isPDP || isDonation) return null

  // Account tab routing for the bottom nav. The bottom nav is the
  // BUYER's primary navigation surface — buyers shouldn't land on the
  // creator dashboard, so:
  //   * Not authenticated → /login
  //   * Authenticated, no creator org → /wishlist (closest 'your stuff'
  //     page; the eventual /account profile page can replace this).
  //   * Authenticated + has creator org → /dashboard/{primary-slug}
  //     deep-link (creators expect their dashboard from this icon).
  const primaryOrg = userOrganizations[0]
  const accountHref = !authenticated
    ? '/login'
    : primaryOrg
      ? `/dashboard/${primaryOrg.slug}`
      : '/portal/orders'
  const accountLabel = !authenticated ? 'Sign in' : 'Account'

  const items = ITEMS.map((item) => {
    if (item.label === 'Sign in') {
      return { ...item, href: accountHref, label: accountLabel }
    }
    return item
  }).filter((item) => !item.authOnly || authenticated)

  const isActive = (href: string) => {
    if (href === '/marketplace') {
      return /\/(marketplace|creators|search|category|products?)\b/.test(pathname)
    }
    return pathname.includes(href)
  }

  // Wishlist + cart now BOTH return the same {items, item_count} shape
  // from their respective endpoints. Read item_count consistently for
  // the badge.
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
