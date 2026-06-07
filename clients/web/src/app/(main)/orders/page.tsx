import { Metadata } from 'next'
import Link from 'next/link'
import { FiArrowRight, FiMail, FiPackage } from 'react-icons/fi'

export const metadata: Metadata = {
  title: 'Your orders · Blyss',
  description:
    'View your purchases on Blyss. Each creator has their own customer portal where you can download files, manage subscriptions, and request refunds.',
  robots: { index: false, follow: false },
}

/**
 * /orders — buyer's "your stuff" page.
 *
 * Polar's customer portal is per-creator (each org gets its own
 * /{org-slug}/portal/* surface). A buyer who's purchased from multiple
 * creators doesn't have a single global portal — they receive an email
 * after each purchase with a magic-link to that creator's portal.
 *
 * Until we wire a cross-org orders aggregator, this page explains the
 * model + offers two paths: (1) check email for the receipt, (2) jump
 * back to the marketplace to find the creator and use their portal
 * directly.
 */
export default function OrdersPage() {
  return (
    <div className="mx-auto max-w-[1280px] px-6 py-12 md:px-16 md:py-20">
      <div className="max-w-[58ch]">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
          Your purchases
        </p>
        <h1 className="mt-4 font-display text-[clamp(40px,5.5vw,68px)] font-semibold leading-[1.05] tracking-[-0.02em] text-[var(--text-primary)]">
          Find your orders.
        </h1>
        <p className="mt-6 max-w-[58ch] font-sans text-[18px] leading-[1.55] text-[var(--text-secondary)]">
          Every creator on Blyss runs their own customer portal — that&rsquo;s
          where you download files, manage subscriptions, request refunds,
          and see receipts. Open the portal from the email we sent after
          your purchase, or visit the creator&rsquo;s storefront and tap
          &ldquo;Sign in to portal&rdquo;.
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {/* Tile 1: check email */}
          <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)]">
              <FiMail
                size={18}
                className="text-[var(--accent)]"
                aria-hidden="true"
              />
            </div>
            <h2 className="mt-4 font-display text-[18px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
              Check your inbox
            </h2>
            <p className="mt-2 font-sans text-[14px] leading-[1.55] text-[var(--text-secondary)]">
              The order confirmation email links straight to the creator&rsquo;s
              portal. Search for &ldquo;Blyss order&rdquo; in your inbox.
            </p>
          </div>

          {/* Tile 2: browse storefronts */}
          <Link
            href="/creators"
            className="group rounded-md border border-[var(--border)] bg-[var(--surface)] p-6 transition-colors hover:border-[var(--accent)] hover:bg-[var(--surface-elevated)]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)] transition-colors group-hover:border-[var(--accent)]">
              <FiPackage
                size={18}
                className="text-[var(--accent)]"
                aria-hidden="true"
              />
            </div>
            <h2 className="mt-4 font-display text-[18px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
              Find the creator
            </h2>
            <p className="mt-2 font-sans text-[14px] leading-[1.55] text-[var(--text-secondary)]">
              Browse to the creator&rsquo;s storefront, then sign into their
              customer portal with the same email you used to buy.
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 font-sans text-[13px] font-medium text-[var(--accent)] transition-all group-hover:gap-2">
              Browse creators
              <FiArrowRight size={14} aria-hidden="true" />
            </span>
          </Link>
        </div>

        <p className="mt-12 font-sans text-[14px] text-[var(--text-muted)]">
          A unified order history is on the way. For now, the per-creator
          portal is the canonical home for your purchases.
        </p>
      </div>
    </div>
  )
}
