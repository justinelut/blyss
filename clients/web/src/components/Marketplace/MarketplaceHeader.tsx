'use client'

import { Search, User, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { BlyssLogo } from '@/design'
import { CartButton } from '@/components/Cart/CartButton'
import { useAuth } from '@/hooks'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/', label: 'Browse' },
  { href: '/creators', label: 'Creators' },
  { href: '/marketplace?type=subscription', label: 'Subscriptions' },
  { href: '/help', label: 'Help' },
]

interface MarketplaceHeaderProps {
  /** Override transparency on scroll for hero pages where we want it always blurred */
  alwaysBlurred?: boolean
}

/**
 * MarketplaceHeader — sticky top nav for the public marketplace.
 *
 * Per plan §3.4 + §6.1 step 1:
 * - Sticky on scroll
 * - --background at 90% opacity + backdrop-blur(20px)
 * - Logo wordmark left
 * - Center: Browse · Creators · Subscriptions · Help
 * - Right: search, cart (with count), avatar dropdown OR "Sign in" + "Start selling"
 * - Mobile: hamburger drawer, full-screen takeover
 */
export const MarketplaceHeader = ({ alwaysBlurred = false }: MarketplaceHeaderProps) => {
  const [scrolled, setScrolled] = useState(alwaysBlurred)
  const [mobileOpen, setMobileOpen] = useState(false)
  const reduce = useReducedMotion()
  const { currentUser, authenticated } = useAuth()

  // Track scroll for blur transition
  useEffect(() => {
    if (alwaysBlurred) return
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [alwaysBlurred])

  // Lock body scroll when mobile drawer open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  return (
    <>
      <header
        className={cn(
          'fixed top-0 z-50 w-full transition-colors',
          reduce ? 'transition-none' : 'duration-300',
          scrolled
            ? 'bg-[var(--background)]/90 backdrop-blur-xl'
            : 'bg-transparent',
        )}
      >
        <div className="mx-auto flex h-20 max-w-[1280px] items-center justify-between px-6 md:px-16">
          {/* Logo */}
          <BlyssLogo size="lg" />

          {/* Center nav — desktop only */}
          <nav
            className="hidden items-center gap-10 md:flex"
            aria-label="Marketplace navigation"
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-sans text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-2 md:gap-3">
            <Link
              href="/search"
              aria-label="Search"
              className="flex h-10 w-10 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]"
            >
              <Search size={20} strokeWidth={1.75} />
            </Link>
            <CartButton />
            {authenticated && currentUser ? (
              <Link
                href="/dashboard"
                aria-label="Account"
                className="hidden h-10 w-10 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)] md:flex"
              >
                <User size={20} strokeWidth={1.75} />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden font-sans text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)] md:inline-block"
                >
                  Sign in
                </Link>
                <Link
                  href="/start"
                  className="hidden h-10 items-center justify-center rounded-md bg-[var(--accent)] px-5 font-sans text-sm font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)] md:inline-flex"
                >
                  Start selling
                </Link>
              </>
            )}
            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              className="flex h-10 w-10 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)] md:hidden"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.2, ease: [0.32, 0.72, 0, 1] }}
          className="fixed inset-0 top-20 z-40 flex flex-col bg-[var(--background)] md:hidden"
        >
          <nav
            className="flex flex-col gap-6 px-6 py-12"
            aria-label="Mobile navigation"
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="font-display text-3xl font-medium text-[var(--text-primary)]"
              >
                {link.label}
              </Link>
            ))}
            <div className="my-4 h-px bg-[var(--border)]" />
            {authenticated && currentUser ? (
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="font-display text-3xl font-medium text-[var(--text-primary)]"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="font-display text-3xl font-medium text-[var(--text-primary)]"
                >
                  Sign in
                </Link>
                <Link
                  href="/start"
                  onClick={() => setMobileOpen(false)}
                  className="mt-4 inline-flex h-12 items-center justify-center rounded-md bg-[var(--accent)] px-6 font-sans text-base font-medium text-[var(--accent-foreground)]"
                >
                  Start selling
                </Link>
              </>
            )}
          </nav>
        </motion.div>
      )}
    </>
  )
}
