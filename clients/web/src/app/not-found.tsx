'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, Search } from 'lucide-react'

/**
 * 404 — editorial not-found page with motion.
 */
export default function NotFound() {
  const reduce = useReducedMotion()
  const ease = [0.32, 0.72, 0, 1] as const

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-6 text-center">
      <motion.span
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]"
      >
        Error · 404
      </motion.span>

      <motion.h1
        initial={reduce ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease, delay: 0.1 }}
        className="mt-6 max-w-[20ch] font-display font-semibold tracking-[-0.025em] leading-[0.98] text-[clamp(48px,8vw,112px)] text-[var(--text-primary)]"
      >
        Lost in the noise.
      </motion.h1>

      <motion.p
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease, delay: 0.3 }}
        className="mt-6 max-w-[44ch] font-sans text-[18px] leading-[1.55] text-[var(--text-secondary)]"
      >
        This page doesn&rsquo;t exist — or it moved. Try the homepage, or
        search for what you were looking for.
      </motion.p>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease, delay: 0.45 }}
        className="mt-10 flex flex-wrap items-center justify-center gap-3"
      >
        <Link
          href="/"
          className="group inline-flex h-12 items-center gap-2 rounded-md bg-[var(--accent)] px-6 font-sans text-[14px] font-medium text-[var(--accent-foreground)] transition-all hover:bg-[var(--accent-hover)] hover:gap-3"
        >
          Go home
          <ArrowRight
            size={16}
            className="transition-transform duration-300 group-hover:translate-x-0.5"
          />
        </Link>
        <Link
          href="/search"
          className="inline-flex h-12 items-center gap-2 rounded-md border border-[var(--border-strong)] px-6 font-sans text-[14px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface)]"
        >
          <Search size={15} />
          Search
        </Link>
      </motion.div>
    </div>
  )
}
