'use client'

import { motion, useReducedMotion } from 'motion/react'
import Link from 'next/link'
import { BlyssLogo, Eyebrow, typography } from '@/design'
import { cn } from '@/lib/utils'

/**
 * LoginShell — editorial split layout for /login.
 *
 * Left: brand panel with eyebrow + tagline + craft list (decorative).
 * Right: auth form (passed as children).
 *
 * Cinematic motion: brand panel slides in from left, form fades up.
 * Mobile collapses to single column with form on top.
 */
export const LoginShell = ({ children }: { children: React.ReactNode }) => {
  const reduce = useReducedMotion()
  const ease = [0.32, 0.72, 0, 1] as const

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[var(--background)] text-[var(--text-primary)] lg:grid-cols-2">
      {/* Left — brand panel (desktop only, decorative) */}
      <motion.aside
        initial={reduce ? false : { opacity: 0, x: -32 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease }}
        className="relative hidden overflow-hidden bg-[var(--surface)] p-12 lg:flex lg:flex-col lg:justify-between xl:p-16"
      >
        {/* Logo top */}
        <div>
          <BlyssLogo size="xl" />
        </div>

        {/* Center: editorial copy */}
        <div className="max-w-[44ch]">
          <Eyebrow accent>Welcome back</Eyebrow>
          <h1
            className={cn(
              'mt-6 font-display font-semibold tracking-[-0.025em] leading-[1.05]',
              'text-[clamp(36px,4.5vw,64px)] text-[var(--text-primary)]',
            )}
          >
            Sign in to your{' '}
            <em className="not-italic text-[var(--accent)]">storefront</em>.
          </h1>
          <p className="mt-6 max-w-[44ch] font-sans text-[18px] leading-[1.55] text-[var(--text-secondary)]">
            The modern marketplace for Kenyan creators. M-Pesa, card. Paid out
            within 24 hours.
          </p>
        </div>

        {/* Bottom: craft list */}
        <div className="flex flex-col gap-3">
          <Eyebrow>What sells on Blyss</Eyebrow>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 font-sans text-[14px] text-[var(--text-secondary)]">
            {['Templates', 'Beats', 'Courses', 'Ebooks', 'Presets', 'Fonts', 'Subscriptions'].map(
              (c, i) => (
                <motion.li
                  key={c}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease, delay: 0.4 + i * 0.05 }}
                >
                  {c}
                </motion.li>
              ),
            )}
          </ul>
        </div>

        {/* Subtle texture */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.03]"
        >
          <defs>
            <pattern id="login-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M0 0H32V32" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#login-grid)" />
        </svg>
      </motion.aside>

      {/* Right — form panel */}
      <motion.main
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease, delay: 0.15 }}
        className="flex min-h-screen items-center justify-center p-6 md:p-12"
      >
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="mb-10 lg:hidden">
            <BlyssLogo size="xl" />
          </div>

          {/* Form heading */}
          <div className="mb-8">
            <h2 className={cn(typography.h3, 'text-[var(--text-primary)]')}>
              Sign in
            </h2>
            <p className="mt-3 font-sans text-[15px] leading-[1.5] text-[var(--text-secondary)]">
              We&rsquo;ll email you a magic link. No passwords.
            </p>
          </div>

          {children}

          <p className="mt-12 font-sans text-[13px] text-[var(--text-muted)]">
            By signing in you agree to our{' '}
            <Link
              href="/terms"
              className="text-[var(--text-secondary)] underline-offset-4 hover:text-[var(--accent)] hover:underline"
            >
              Terms
            </Link>{' '}
            and{' '}
            <Link
              href="/privacy"
              className="text-[var(--text-secondary)] underline-offset-4 hover:text-[var(--accent)] hover:underline"
            >
              Privacy
            </Link>
            .
          </p>
        </div>
      </motion.main>
    </div>
  )
}
