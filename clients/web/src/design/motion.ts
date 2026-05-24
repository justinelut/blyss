/**
 * Blyss motion tokens — plan/04-ui-direction.md §3.4
 *
 * One animation library: `motion` (motion.dev). Use `motion/react` for
 * component animations, the bare `motion` import for vanilla scroll APIs.
 *
 * Easings: `cubic-bezier(0.32, 0.72, 0, 1)` everywhere — smooth, not bouncy.
 * Durations: 200ms quick / 350ms default / 800ms hero. Nothing over 1200ms.
 *
 * `prefers-reduced-motion` is respected via the `useReducedMotion()` hook
 * exported from motion/react. Wrap variants in the `respectReducedMotion()`
 * helper to short-circuit to instant transitions for users who set the OS
 * preference. Lighthouse accessibility will fail otherwise.
 */

import { type Transition } from 'motion/react'

/** Standard smooth easing — used across all transitions */
export const easings = {
  smooth: [0.32, 0.72, 0, 1] as const,
  /** For elements entering from offscreen with a touch of overshoot */
  decelerate: [0.16, 1, 0.3, 1] as const,
  /** Internal exits / dismissals */
  accelerate: [0.7, 0, 0.84, 0] as const,
} as const

/** Duration scale (in seconds, motion's native unit) */
export const durations = {
  fast: 0.2,
  default: 0.35,
  slow: 0.6,
  hero: 0.8,
} as const

/** Pre-baked transitions for common patterns */
export const transitions = {
  default: {
    duration: durations.default,
    ease: easings.smooth,
  } satisfies Transition,
  fast: {
    duration: durations.fast,
    ease: easings.smooth,
  } satisfies Transition,
  hero: {
    duration: durations.hero,
    ease: easings.smooth,
  } satisfies Transition,
  spring: {
    type: 'spring',
    stiffness: 380,
    damping: 30,
  } satisfies Transition,
} as const

/**
 * Helper for variants that should respect prefers-reduced-motion. Wrap the
 * transition with this and the user's OS setting will short-circuit to
 * instant.
 *
 *   const t = respectReducedMotion(reduce, transitions.default)
 */
export const respectReducedMotion = (
  prefersReduced: boolean | null,
  transition: Transition,
): Transition => {
  if (prefersReduced) return { duration: 0 }
  return transition
}

/** Common animation variants */
export const variants = {
  /** Fade up entry — used for content blocks scrolling into view */
  fadeUp: {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
  },
  /** Plain fade in/out */
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  /** Card hover — subtle lift via translate (NOT shadow per §3.4) */
  cardHover: {
    rest: { y: 0 },
    hover: { y: -2 },
  },
  /** Image hover scale — used on product cards (1.04 max per §3.4) */
  imageHover: {
    rest: { scale: 1 },
    hover: { scale: 1.04 },
  },
} as const
