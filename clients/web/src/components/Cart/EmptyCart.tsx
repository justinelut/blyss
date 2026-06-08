import Link from 'next/link'
import { FiArrowRight } from 'react-icons/fi'

/**
 * EmptyCart — editorial, not cartoon.
 *
 * Anti-references applied per the blyss-design skill:
 *   - No giant cartoon shopping-cart illustration
 *   - No drop-shadow card
 *   - Type-driven hierarchy: eyebrow → headline → lede → CTA
 *
 * Reference DNA: Are.na empty-state pattern + Aimé Leon Dore section
 * breaks (single tonal block in --surface, hairline above + below
 * when there's adjacent content).
 */
export const EmptyCart = () => {
  return (
    <div className="mx-auto max-w-[640px] px-6 py-20 md:py-28">
      <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        Cart
      </p>
      <h1 className="mt-3 font-display text-[clamp(36px,4.5vw,56px)] font-semibold leading-[1.05] tracking-[-0.025em] text-[var(--text-primary)]">
        Nothing here yet.
      </h1>
      <p className="mt-5 max-w-[44ch] font-sans text-[16px] leading-[1.55] text-[var(--text-secondary)]">
        Browse the marketplace and add something you love. Each
        creator&rsquo;s items get their own checkout, so you can pick
        exactly what to buy from whom.
      </p>
      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Link
          href="/marketplace"
          className="inline-flex h-12 items-center gap-2 rounded-md bg-[var(--accent)] px-7 font-sans text-[15px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
        >
          Browse marketplace
          <FiArrowRight size={14} aria-hidden="true" />
        </Link>
        <Link
          href="/wishlist"
          className="inline-flex h-12 items-center gap-2 rounded-md border border-[var(--border-strong)] bg-transparent px-7 font-sans text-[14px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-sunken)]"
        >
          Open wishlist
        </Link>
      </div>
    </div>
  )
}
