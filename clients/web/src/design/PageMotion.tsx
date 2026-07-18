"use client";

import { motion } from "motion/react";
import { ReactNode } from "react";

const ease = [0.32, 0.72, 0, 1] as const;

/**
 * Core page content is visible in prerendered HTML. Motion enhances layout
 * after hydration; it must never be a prerequisite for reading or acting.
 */
export const PageEnter = ({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) => (
  <motion.div
    initial={false}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, ease, delay }}
    className={className}
  >
    {children}
  </motion.div>
);

export const StaggerList = ({
  children,
  className,
  staggerDelay = 0.06,
}: {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}) => (
  <motion.div
    initial={false}
    whileInView="visible"
    viewport={{ once: true, margin: "-10%" }}
    variants={{ visible: { transition: { staggerChildren: staggerDelay } } }}
    className={className}
  >
    {children}
  </motion.div>
);

export const StaggerItem = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <motion.div
    variants={{
      visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease } },
    }}
    className={className}
  >
    {children}
  </motion.div>
);

export const FadeIn = ({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) => (
  <motion.div
    initial={false}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.35, ease, delay }}
    className={className}
  >
    {children}
  </motion.div>
);
