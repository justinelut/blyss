import Link from 'next/link'

/**
 * 404 — editorial per §6.13.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--surface-sunken)] px-6 text-center">
      <h1 className="font-display text-[clamp(48px,6vw,88px)] font-semibold tracking-[-0.025em] text-[var(--text-primary)]">
        404
      </h1>
      <p className="mt-4 max-w-[44ch] font-sans text-[18px] leading-[1.5] text-[var(--text-secondary)]">
        This page got lost in the noise. Try the homepage or search.
      </p>
      <div className="mt-10 flex items-center gap-4">
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-md bg-[var(--accent)] px-6 font-sans text-[14px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
        >
          Go home
        </Link>
        <Link
          href="/search"
          className="inline-flex h-11 items-center rounded-md border border-[var(--border-strong)] px-6 font-sans text-[14px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface)]"
        >
          Search
        </Link>
      </div>
    </div>
  )
}
