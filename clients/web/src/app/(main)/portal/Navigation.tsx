'use client'

import { schemas } from '@/lib/api'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/Select'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { twMerge } from 'tailwind-merge'

interface NavigationProps {
  user: schemas['UserRead']
}

/**
 * Marketplace portal navigation.
 *
 * Same visual structure as the per-org portal Navigation (sticky
 * sidebar on md+, native Select on mobile) but stripped of per-org
 * branding + customer-session-token plumbing. Links all point at
 * /portal/* (top-level).
 *
 * Pages exposed: Overview, Orders, Subscriptions, Wallet, Wishlist,
 * Settings. Usage is per-subscription so it lives behind sub detail.
 * Request / Authenticate / Claim were magic-link-only — gone now,
 * replaced by the standard Blyss user sign-in.
 */

const LINKS = [
  {
    href: '/portal/overview',
    label: 'Overview',
    isActive: (path: string) => path === '/portal' || path.includes('/overview'),
  },
  {
    href: '/portal/orders',
    label: 'Orders',
    isActive: (path: string) => path.includes('/portal/orders'),
  },
  {
    href: '/portal/subscriptions',
    label: 'Subscriptions',
    isActive: (path: string) => path.includes('/portal/subscriptions'),
  },
  {
    href: '/portal/wallet',
    label: 'Wallet',
    isActive: (path: string) => path.includes('/portal/wallet'),
  },
  {
    href: '/portal/wishlist',
    label: 'Wishlist',
    isActive: (path: string) => path.includes('/portal/wishlist'),
  },
  {
    href: '/portal/settings',
    label: 'Settings',
    isActive: (path: string) => path.includes('/portal/settings'),
  },
] as const

export const Navigation = ({ user }: NavigationProps) => {
  const currentPath = usePathname() ?? ''
  const router = useRouter()

  return (
    <>
      <nav className="sticky top-0 hidden h-fit w-40 flex-none flex-col gap-y-6 py-12 md:flex lg:w-64">
        <div className="flex flex-col">
          {user.email ? (
            <span className="dark:text-polar-500 text-gray-500">
              {user.email}
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-y-1">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={twMerge(
                'dark:text-polar-500 dark:hover:bg-polar-800 rounded-lg border border-transparent px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors duration-75 hover:bg-gray-100',
                link.isActive(currentPath) &&
                  'dark:bg-polar-800 dark:border-polar-700 bg-gray-100 text-black dark:text-white',
              )}
              prefetch
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
      <Select
        value={LINKS.find(({ href }) => href === currentPath)?.label}
        onValueChange={(value) => {
          router.push(LINKS.find(({ label }) => label === value)?.href ?? '')
        }}
      >
        <SelectTrigger className="md:hidden">
          <SelectValue placeholder="Select page" />
        </SelectTrigger>
        <SelectContent>
          {LINKS.map((link) => (
            <SelectItem key={link.href} value={link.label}>
              {link.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )
}
