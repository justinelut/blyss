'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { motion, useReducedMotion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'blyss-theme'
type Theme = 'light' | 'dark'

/**
 * ThemeToggle — light/dark mode switch with motion.
 *
 * Persists to localStorage. Sets `data-theme` on <html> so the CSS variables
 * in design/tokens.css switch palettes. Respects prefers-color-scheme on
 * first visit when no preference is stored.
 */
export const ThemeToggle = ({ className }: { className?: string }) => {
  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState<Theme>('light')
  const reduce = useReducedMotion()

  // Hydration-safe init
  useEffect(() => {
    setMounted(true)
    const stored = (typeof window !== 'undefined'
      ? localStorage.getItem(STORAGE_KEY)
      : null) as Theme | null
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored)
      applyTheme(stored)
      return
    }
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches
    const initial: Theme = prefersDark ? 'dark' : 'light'
    setTheme(initial)
    applyTheme(initial)
  }, [])

  const toggle = () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    applyTheme(next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  if (!mounted) {
    // Prevent hydration mismatch — render a transparent placeholder of the
    // same dimensions so layout doesn't shift.
    return <div className={cn('h-10 w-10', className)} aria-hidden="true" />
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      className={cn(
        'relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]',
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === 'light' ? (
          <motion.span
            key="moon"
            initial={reduce ? false : { rotate: -90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={reduce ? undefined : { rotate: 90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Moon size={18} strokeWidth={1.75} />
          </motion.span>
        ) : (
          <motion.span
            key="sun"
            initial={reduce ? false : { rotate: -90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={reduce ? undefined : { rotate: 90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Sun size={18} strokeWidth={1.75} />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}

function applyTheme(theme: Theme) {
  const html = document.documentElement
  if (theme === 'dark') {
    html.setAttribute('data-theme', 'dark')
    html.classList.add('dark')
  } else {
    html.removeAttribute('data-theme')
    html.classList.remove('dark')
  }
}
