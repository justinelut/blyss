"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Eyebrow, typography } from "@/design";
import { LegalDoc } from "@/design/LegalDoc";
import { cn } from "@/lib/utils";

interface LegalPageShellProps {
  title: string;
  content: string;
}

const LEGAL_NAV = [
  { href: "/about", label: "About" },
  { href: "/help", label: "Help" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/acceptable-use", label: "Acceptable use" },
  { href: "/refunds", label: "Refunds" },
];

/**
 * LegalPageShell — modernizes static legal pages with editorial layout.
 * Sidebar nav (sticky) + main column with motion-driven entrance.
 */
export const LegalPageShell = ({ title, content }: LegalPageShellProps) => {
  const reduce = useReducedMotion();
  const ease = [0.32, 0.72, 0, 1] as const;
  const pathname = usePathname();

  return (
    <div className="bg-[var(--background)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-[1280px] px-6 py-12 md:px-16 md:py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[220px_1fr] lg:gap-20">
          {/* Sidebar */}
          <motion.aside
            initial={reduce ? false : { opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease }}
            className="lg:sticky lg:top-28 lg:self-start"
          >
            <Eyebrow>Legal</Eyebrow>
            <nav className="mt-4 flex flex-col gap-2">
              {LEGAL_NAV.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group relative inline-flex items-center py-1.5 font-sans text-[14px] transition-colors",
                      active
                        ? "text-[var(--accent)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="legal-nav-indicator"
                        className="absolute -left-3 h-4 w-0.5 rounded-full bg-[var(--accent)]"
                      />
                    )}
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </motion.aside>

          {/* Main column */}
          <motion.main
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.1 }}
            className="min-w-0"
          >
            <Eyebrow accent>Legal</Eyebrow>
            <h1
              className={cn(
                "mt-3 font-display font-semibold tracking-[-0.025em] leading-[1.05]",
                "text-[clamp(36px,5vw,64px)] text-[var(--text-primary)]",
              )}
            >
              {title}
            </h1>
            <div className="mt-10">
              <LegalDoc>{content}</LegalDoc>
            </div>
          </motion.main>
        </div>
      </div>
    </div>
  );
};
