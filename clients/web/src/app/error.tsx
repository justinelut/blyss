'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { RefreshCw } from 'lucide-react'

/**
 * 500 — editorial server error page with motion.
 */
export default function Error({ error }: { error: Error }) {
  const reduce = useReducedMotion()
  const ease = [0.32, 0.72, 0, 1] as const

  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-6 text-center">
      <motion.span
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--danger)]"
      >
        Error · 500
      </motion.span>

      <motion.h1
        initial={reduce ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease, delay: 0.1 }}
        className="mt-6 max-w-[20ch] font-display font-semibold tracking-[-0.025em] leading-[1] text-[clamp(40px,6vw,80px)] text-[var(--text-primary)]"
      >
        Something broke on our side.
      </motion.h1>

      <motion.p
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease, delay: 0.3 }}
        className="mt-6 max-w-[48ch] font-sans text-[18px] leading-[1.55] text-[var(--text-secondary)]"
      >
        The team&rsquo;s been notified. Try refreshing in a minute — most
        issues clear themselves up.
      </motion.p>

      <motion.button
        type="button"
        onClick={() => window.location.reload()}
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease, delay: 0.45 }}
        className="mt-10 inline-flex h-12 items-center gap-2 rounded-md bg-[var(--accent)] px-6 font-sans text-[14px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
      >
        <RefreshCw size={15} />
        Refresh
      </motion.button>
    </div>
  )
}
