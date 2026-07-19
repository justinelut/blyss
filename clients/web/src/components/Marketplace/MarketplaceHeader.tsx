"use client";

/* Hallmark · component: nav · archetype: N9 edge-aligned minimal
 * theme: Blyss ink + oxblood
 * states: default (transparent) · scrolled (backdrop-blur) · hover · focus-
 *         visible · mobile-drawer
 * contrast: pass · slop: pass (gates 51, 60)
 *
 * Reference DNA: Aimé Leon Dore + SSENSE — wordmark left, links flush
 * underneath, right cluster carries actions. NOT N1 (which is the AI default
 * 4–5 inline links centered with right-button at full viewport width); the
 * Blyss header keeps the wordmark + 4 destinations, but uses underline-on-
 * hover (editorial) rather than color-only, and goes fully transparent at
 * the hero so the marquee imagery breathes.
 */

import { FiSearch, FiUser, FiMenu, FiX, FiHeart } from "react-icons/fi";
import { FiGrid, FiLogOut, FiMoon, FiSun } from "react-icons/fi";
import Link from "./LocaleLink";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { BlyssLogo } from "@/design";
import { CartButton } from "@/components/Cart/CartButton";
import { CountrySwitcher } from "./CountrySwitcher";
import { useAuth } from "@/hooks";
import { cn } from "@/lib/utils";
import { CONFIG } from "@/utils/config";
import { useTheme } from "next-themes";

const navLinks = [
  { href: "/marketplace", label: "Browse" },
  { href: "/creators", label: "Creators" },
  { href: "/marketplace?type=subscription", label: "Subscriptions" },
  { href: "/help", label: "Help" },
];

interface MarketplaceHeaderProps {
  /** Override transparency on scroll for hero pages where we want it always blurred */
  alwaysBlurred?: boolean;
}

/**
 * MarketplaceHeader — sticky top nav for the public marketplace.
 *
 * Per plan §3.4 + §6.1 step 1:
 * - Sticky on scroll
 * - --background at 90% opacity + backdrop-blur(20px)
 * - Logo wordmark left
 * - Center: Browse · Creators · Subscriptions · Help
 * - Right: search, cart (with count), avatar dropdown OR "Sign in" + "Start selling"
 * - Mobile: hamburger drawer, full-screen takeover
 */
export const MarketplaceHeader = ({
  alwaysBlurred = false,
}: MarketplaceHeaderProps) => {
  const [scrolled, setScrolled] = useState(alwaysBlurred);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();
  const { currentUser, authenticated, userOrganizations } = useAuth();

  // Track scroll for blur transition
  useEffect(() => {
    if (alwaysBlurred) return;
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [alwaysBlurred]);

  // Lock body scroll and support keyboard dismissal while the drawer is open.
  useEffect(() => {
    if (!mobileOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
        requestAnimationFrame(() => mobileMenuButtonRef.current?.focus());
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  return (
    <>
      <header
        className={cn(
          "fixed top-0 z-50 w-full transition-colors",
          reduce ? "transition-none" : "duration-300",
          scrolled
            ? "bg-[var(--background)]/90 backdrop-blur-xl"
            : "bg-transparent",
        )}
      >
        <div className="mx-auto flex h-20 max-w-[1280px] items-center justify-between px-6 md:px-16">
          {/* Logo */}
          <BlyssLogo size="lg" />

          {/* Center nav — desktop only */}
          <nav
            className="hidden items-center gap-10 lg:flex"
            aria-label="Marketplace navigation"
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-sans text-sm font-medium text-[var(--text-secondary)] underline-offset-[6px] decoration-[1px] transition-colors hover:text-[var(--text-primary)] hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Search affordance — small icon button on phones, a longer
                search-bar-styled link on desktop. Both navigate to /search.
                Real search lives on the marketplace browse page (sticky
                input with debounce); this just gets buyers there fast. */}
            <Link
              href="/search"
              aria-label="Search the marketplace"
              className="flex h-10 w-10 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)] lg:hidden"
            >
              <FiSearch size={20} />
            </Link>
            <Link
              href="/search"
              aria-label="Search the marketplace"
              className="hidden h-10 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-sunken)] px-3 font-sans text-[13px] text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)] lg:inline-flex lg:w-[180px] xl:w-[220px]"
            >
              <FiSearch size={16} aria-hidden="true" />
              <span>Search products…</span>
            </Link>
            <CountrySwitcher className="hidden sm:block" />
            {/* Wishlist quick-link — Etsy pattern. Shown only when signed
                in (the wishlist is per-user; clicking when anonymous would
                bounce to /login anyway). Hidden on phones to keep the
                header compact alongside cart + country switcher. */}
            {authenticated && (
              <Link
                href="/wishlist"
                aria-label="Wishlist"
                className="hidden h-10 w-10 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)] lg:flex"
              >
                <FiHeart size={18} aria-hidden="true" />
              </Link>
            )}
            <CartButton />
            {authenticated && currentUser ? (
              <AccountMenu />
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden font-sans text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)] lg:inline-block"
                >
                  Sign in
                </Link>
                <Link
                  href="/start"
                  className="hidden h-10 items-center justify-center rounded-md bg-[var(--accent)] px-5 font-sans text-sm font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)] lg:inline-flex"
                >
                  Start selling
                </Link>
              </>
            )}
            {/* Mobile hamburger */}
            <button
              ref={mobileMenuButtonRef}
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="marketplace-mobile-menu"
              className="flex h-10 w-10 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)] lg:hidden"
            >
              {mobileOpen ? <FiX size={22} /> : <FiMenu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <motion.div
          id="marketplace-mobile-menu"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.2, ease: [0.32, 0.72, 0, 1] }}
          className="fixed inset-0 top-20 z-40 flex flex-col bg-[var(--background)] lg:hidden"
        >
          <nav
            className="flex flex-col gap-6 px-6 py-12"
            aria-label="Mobile navigation"
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="font-display text-3xl font-medium text-[var(--text-primary)]"
              >
                {link.label}
              </Link>
            ))}
            <div className="my-4 h-px bg-[var(--border)]" />
            {authenticated && currentUser ? (
              <>
                <Link
                  href="/wishlist"
                  onClick={() => setMobileOpen(false)}
                  className="font-display text-3xl font-medium text-[var(--text-primary)]"
                >
                  Wishlist
                </Link>
                <Link
                  href="/cart"
                  onClick={() => setMobileOpen(false)}
                  className="font-display text-3xl font-medium text-[var(--text-primary)]"
                >
                  Cart
                </Link>
                {userOrganizations.length > 0 && (
                  <Link
                    href={`/dashboard/${userOrganizations[0].slug}`}
                    onClick={() => setMobileOpen(false)}
                    className="font-display text-3xl font-medium text-[var(--text-primary)]"
                  >
                    Dashboard
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="font-display text-3xl font-medium text-[var(--text-primary)]"
                >
                  Sign in
                </Link>
                <Link
                  href="/start"
                  onClick={() => setMobileOpen(false)}
                  className="mt-4 inline-flex h-12 items-center justify-center rounded-md bg-[var(--accent)] px-6 font-sans text-base font-medium text-[var(--accent-foreground)]"
                >
                  Start selling
                </Link>
              </>
            )}
            {/* Theme toggle — same surface as the desktop AccountMenu's
                ThemeToggleRow, sized for mobile-tap targets. */}
            <div className="my-4 h-px bg-[var(--border)]" />
            <MobileThemeToggle />
          </nav>
        </motion.div>
      )}
    </>
  );
};

/**
 * MobileThemeToggle — large tap-friendly version of ThemeToggleRow,
 * rendered inside the mobile menu drawer. Same data-theme +
 * localStorage mechanism as the desktop dropdown row, sized to match
 * the mobile drawer's display-3xl link rhythm.
 */
function useHeaderTheme() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  const theme = resolvedTheme === "dark" ? "dark" : "light";
  return {
    mounted,
    theme,
    toggle: () => setTheme(theme === "light" ? "dark" : "light"),
  };
}

function MobileThemeToggle() {
  const { mounted, theme, toggle } = useHeaderTheme();

  if (!mounted) return <div className="h-12" aria-hidden="true" />;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        theme === "light" ? "Switch to dark mode" : "Switch to light mode"
      }
      className="flex items-center justify-between gap-3 font-display text-3xl font-medium text-[var(--text-primary)]"
    >
      <span className="flex items-center gap-3">
        {theme === "light" ? (
          <FiMoon size={20} className="text-[var(--text-muted)]" />
        ) : (
          <FiSun size={20} className="text-[var(--text-muted)]" />
        )}
        Theme
      </span>
      <span className="font-sans text-[14px] text-[var(--text-muted)]">
        {theme === "light" ? "Light" : "Dark"}
      </span>
    </button>
  );
}

/**
 * AccountMenu — click-to-open dropdown on the header's account icon.
 *
 * Shows: Dashboard (only for users with at least one creator org),
 * Wishlist, Orders, Sign out. Replaces the previous hardcoded
 * `<Link href="/dashboard">` which sent every signed-in user (including
 * customers who never sold anything) to the dashboard with no obvious way
 * back. Buyers now see a buyer-oriented set of links; creators still get
 * the dashboard option deep-linked to their primary org slug.
 *
 * Implementation: vanilla useState + outside-click handler. Avoids a
 * radix dependency for this small surface — the dropdown is purely
 * presentational and the keyboard handling (Escape, Tab) is delegated
 * to native focus order on the inline links.
 */
function AccountMenu() {
  const { currentUser, userOrganizations } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Close on outside click and on route change. setOpen(false) on
  // currentUser change is defensive: if the user signs out elsewhere
  // (e.g. a customer-portal magic link expires), the dropdown closes.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Pick the creator's primary org for the Dashboard link. If the user
  // has no creator orgs (pure customer), Dashboard hides entirely.
  const primaryOrg = userOrganizations[0];
  const dashboardHref = primaryOrg ? `/dashboard/${primaryOrg.slug}` : null;

  return (
    <div ref={ref} className="relative hidden lg:block">
      <button
        type="button"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]"
      >
        <FiUser size={20} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]"
        >
          <div className="border-b border-[var(--border)] px-4 py-3">
            <p className="font-sans text-[13px] text-[var(--text-muted)]">
              Signed in as
            </p>
            <p className="truncate font-sans text-[14px] font-medium text-[var(--text-primary)]">
              {currentUser?.email}
            </p>
          </div>
          <ul className="flex flex-col py-2">
            {dashboardHref && (
              <li>
                <Link
                  href={dashboardHref}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 font-sans text-[14px] text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-sunken)]"
                >
                  <FiGrid size={16} className="text-[var(--text-muted)]" />
                  Creator dashboard
                </Link>
              </li>
            )}
            <li>
              <Link
                href="/wishlist"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 font-sans text-[14px] text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-sunken)]"
              >
                <FiHeart size={16} className="text-[var(--text-muted)]" />
                Wishlist
              </Link>
            </li>
          </ul>
          <div className="border-t border-[var(--border)] py-2">
            <ThemeToggleRow />
          </div>
          <div className="border-t border-[var(--border)] py-2">
            <a
              href={`${CONFIG.BASE_URL}/v1/auth/logout`}
              role="menuitem"
              className="flex items-center gap-3 px-4 py-2.5 font-sans text-[14px] text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-sunken)]"
            >
              <FiLogOut size={16} className="text-[var(--text-muted)]" />
              Sign out
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ThemeToggleRow — light/dark switch styled as a menuitem inside the
 * AccountMenu dropdown. Mirrors the data-theme + localStorage pattern
 * the existing `clients/web/src/design/ThemeToggle.tsx` uses, but
 * styled as a row (not an icon button) to match the surrounding
 * Dashboard / Wishlist / Sign out items.
 */
function ThemeToggleRow() {
  const { mounted, theme, toggle } = useHeaderTheme();

  if (!mounted) {
    return <div className="flex h-10 items-center px-4" aria-hidden="true" />;
  }

  return (
    <button
      type="button"
      role="menuitem"
      onClick={toggle}
      className="flex w-full items-center justify-between gap-3 px-4 py-2.5 font-sans text-[14px] text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-sunken)]"
      aria-label={
        theme === "light" ? "Switch to dark mode" : "Switch to light mode"
      }
    >
      <span className="flex items-center gap-3">
        {theme === "light" ? (
          <FiMoon size={16} className="text-[var(--text-muted)]" />
        ) : (
          <FiSun size={16} className="text-[var(--text-muted)]" />
        )}
        Theme
      </span>
      <span className="font-sans text-[12px] text-[var(--text-muted)]">
        {theme === "light" ? "Light" : "Dark"}
      </span>
    </button>
  );
}
