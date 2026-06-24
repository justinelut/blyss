'use client'

/* Hallmark · component: start/footer · genre: editorial
 * Minimal close-the-loop footer for the recruitment surface.
 * No nav forest, no social-proof strip — just the wordmark, a
 * single "Already selling? Sign in" line, and a quiet attribution.
 * Visitors who reach this footer didn't sign up after reading the
 * full page; the footer's job is to give them ONE easy way back in.
 */

import Link from 'next/link'

export const StartFooter = () => (
  <footer
    className="border-t border-[var(--border)] bg-[var(--surface)]"
    aria-label="Start page footer"
  >
    <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-6 py-12 md:flex-row md:items-end md:justify-between md:px-16 md:py-16">
      <div className="flex flex-col gap-2">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
          Make. Sell. Get paid.
        </p>
        <h2 className="font-display text-[28px] font-semibold leading-[1.05] tracking-[-0.02em] text-[var(--text-primary)] md:text-[36px]">
          Open your Blyss shop.
        </h2>
        <p className="mt-2 max-w-[44ch] font-sans text-[14px] leading-[1.55] text-[var(--text-secondary)]">
          Independent creators across Africa price in their currency,
          collect via M-Pesa or card, and get paid within 24 hours.
        </p>
      </div>

      <div className="flex flex-col gap-3 md:items-end">
        <Link
          href="/login?return_to=/dashboard"
          className="inline-flex h-12 items-center justify-center rounded-md bg-[var(--accent)] px-7 font-sans text-[14px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
        >
          Start selling
        </Link>
        <Link
          href="/login?return_to=/dashboard"
          className="font-sans text-[13px] text-[var(--text-secondary)] underline-offset-4 hover:text-[var(--text-primary)] hover:underline"
        >
          Already selling? Sign in
        </Link>
      </div>
    </div>

    {/* Quiet attribution row */}
    <div className="border-t border-[var(--border)]">
      <div className="mx-auto flex max-w-[1280px] flex-col-reverse items-start justify-between gap-3 px-6 py-6 md:flex-row md:items-center md:px-16">
        <p className="font-sans text-[12px] text-[var(--text-muted)]">
          © {new Date().getFullYear()} Blyss. All rights reserved.
        </p>
        <div className="flex items-center gap-5 font-sans text-[12px] text-[var(--text-muted)]">
          <Link href="/" className="hover:text-[var(--text-primary)]">
            Marketplace
          </Link>
          <Link href="/help" className="hover:text-[var(--text-primary)]">
            Help
          </Link>
          {/* These pages live at the root, NOT under /legal/. The
              previous /legal/terms + /legal/privacy paths 404'd
              because the actual app routes are app/(main)/terms,
              app/(main)/privacy, app/(main)/acceptable-use — same
              paths every other footer in the app uses (Organization
              footer, Login, Onboarding). */}
          <Link href="/terms" className="hover:text-[var(--text-primary)]">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-[var(--text-primary)]">
            Privacy
          </Link>
          <Link
            href="/acceptable-use"
            className="hover:text-[var(--text-primary)]"
          >
            Acceptable use
          </Link>
        </div>
      </div>
    </div>
  </footer>
)
