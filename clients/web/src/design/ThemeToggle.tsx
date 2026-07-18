"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { motion, useReducedMotion, AnimatePresence } from "motion/react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

/**
 * ThemeToggle — an explicit light/dark switch backed by the single
 * next-themes provider. First visits stay light regardless of OS preference;
 * an explicit choice persists under the provider's `blyss-theme` storage key.
 */
export const ThemeToggle = ({ className }: { className?: string }) => {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const reduce = useReducedMotion();

  useEffect(() => setMounted(true), []);

  const theme = resolvedTheme === "dark" ? "dark" : "light";
  const toggle = () => setTheme(theme === "light" ? "dark" : "light");

  if (!mounted) {
    return <div className={cn("h-10 w-10", className)} aria-hidden="true" />;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        theme === "light" ? "Switch to dark mode" : "Switch to light mode"
      }
      className={cn(
        "relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]",
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === "light" ? (
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
  );
};
