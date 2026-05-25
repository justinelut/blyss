'use client'

import { motion, useReducedMotion } from 'motion/react'
import { ReactNode } from 'react'

const ease = [0.32, 0.72, 0, 1] as const

/**
 * PageEnter — wraps a page in a fade-up motion block.
 * Use as the outer wrapper for any page that should reveal on load.
 */
export const PageEnter = ({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) => {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * StaggerList — wraps a list/grid where each child should fade up with stagger.
 * Use whileInView so it triggers on scroll, not just on mount.
 */
export const StaggerList = ({
  children,
  className,
  staggerDelay = 0.06,
}: {
  children: ReactNode
  className?: string
  staggerDelay?: number
}) => {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-10%' }}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: reduce ? 0 : staggerDelay },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * StaggerItem — child of StaggerList that fades up.
 */
export const StaggerItem = ({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) => {
  const reduce = useReducedMotion()
  return (
    <motion.div
      variants={{
        hidden: reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * FadeIn — simple fade-in on mount.
 */
export const FadeIn = ({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) => {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
