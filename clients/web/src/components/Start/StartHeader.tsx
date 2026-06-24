'use client'

/* Hallmark · component: start/header · genre: editorial
 * Minimal recruitment-page header. NOT the full marketplace chrome —
 * /start is a recruiting funnel, not the buyer marketplace, so the
 * header carries fewer affordances: wordmark + a single "Browse" link
 * back to the marketplace + a sign-in path. The "Start selling" CTA
 * the marketplace header would carry is implicit on this page (the
 * whole page IS that CTA).
 */

import Link from 'next/link'
import { FiArrowUpRight } from 'react-icons/fi'

export const StartHeader = () => (
  <header
    className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md"
    aria-label="Start selling on Blyss"
  >
    <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-6 md:h-[72px] md:px-16">
      {/* Wordmark */}
      <Link
        href="/"
        aria-label="Blyss home"
        className="font-display text-[22px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]"
      >
        Blyss
      </Link>

      {/* Right cluster — quiet on this surface; no cart, no search, no
          avatar dropdown. Just a way out (Browse) and a way in (Sign
          in). Sign-up itself happens via /login when the visitor
          clicks any of the on-page CTAs. */}
      <nav className="flex items-center gap-1 sm:gap-3" aria-label="Header navigation">
        <Link
          href="/marketplace"
          className="hidden font-sans text-[13px] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] sm:inline-flex sm:items-center sm:gap-1.5 sm:px-3 sm:py-2"
        >
          Browse marketplace
          <FiArrowUpRight size={13} aria-hidden="true" />
        </Link>
        <Link
          href="/login?return_to=/dashboard"
          className="inline-flex h-10 items-center rounded-md border border-[var(--border-strong)] bg-[var(--background)] px-4 font-sans text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-sunken)]"
        >
          Sign in
        </Link>
      </nav>
    </div>
  </header>
)
