"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import Link from "next/link";
import { FiArrowLeft, FiHeart } from "react-icons/fi";
import { OptimizedImage } from "@/components/Image/OptimizedImage";
import {
  BlyssDialog,
  BlyssDialogBody,
  BlyssDialogEyebrow,
  BlyssDialogHeader,
  BlyssDialogTitle,
} from "@/design/BlyssDialog";
import { cn } from "@/lib/utils";

export interface StorefrontHeroProps {
  /** Creator display name */
  name: string;
  /** URL slug — also used as the @handle */
  slug: string;
  /** Organization id — needed to scope the cart icon to this creator */
  organizationId: string;
  /** Single-line bio shown beneath the name */
  bio?: string | null;
  /** Avatar (1:1) — 88px square */
  avatarUrl?: string | null;
  /** Banner image (16:9 minimum 1920×1080). Falls back to a tonal block. */
  bannerUrl?: string | null;
  /** City — falls back to "Nairobi" per Blyss's Kenyan voice */
  city?: string | null;
  /** Whether the creator has at least one subscription tier — shows the
   *  "Subscribe" CTA when true; hides it otherwise to avoid dead links. */
  hasSubscriptions?: boolean;
  /** Tip / donation enabled — shows the "Tip" CTA. v1 always renders true to
   *  match §6.4 spec; donation modal wiring is a phase-7 task. */
  tipEnabled?: boolean;
  /** Optional handler for "Subscribe" CTA — typically scrolls to subs tab */
  onSubscribeClick?: () => void;
  /** Optional handler for "Tip" CTA — opens donation modal */
  onTipClick?: () => void;
  /** Per-creator card stats — same numbers shown on directory cards.
   *  Hidden when all three are zero so a fresh storefront doesn't
   *  read "0 sold · KSh 0 earned". */
  productsCount?: number;
  totalOrders?: number;
  totalEarned?: number;
}

/**
 * StorefrontHero — full-bleed editorial banner for /creators/[slug].
 *
 * Per plan/07-pages.md §6.4 step 1:
 * - 16:9 banner (1920×1080 min) — single tonal block fallback
 * - Bottom-left overlay: avatar (88px) + name (Inter Display 600 48px) +
 *   @handle + one-line bio + city
 * - Right side: small Subscribe button (jumps to subs tab) and Tip button
 *   (opens donation modal). Tip rendered when tipEnabled.
 *
 * Per §3.4 imagery: warm overlay, no gradients, no shadows. The dark scrim
 * over the image is a SINGLE-tone rgba block (not a gradient) sized to the
 * bottom 50% of the banner so overlay text reads while the upper half of the
 * image stays unaltered.
 *
 * Motion: banner scales 1.04 → 1.0 over 800ms on first paint; respects
 * prefers-reduced-motion.
 */
export const StorefrontHero = ({
  name,
  slug,
  organizationId,
  bio,
  avatarUrl,
  bannerUrl,
  city,
  hasSubscriptions = false,
  tipEnabled = false,
  onSubscribeClick,
  onTipClick,
  productsCount = 0,
  totalOrders = 0,
  totalEarned = 0,
}: StorefrontHeroProps) => {
  const reduce = useReducedMotion();
  const ease = [0.32, 0.72, 0, 1] as const;
  const [bioOpen, setBioOpen] = useState(false);

  // Bio is truncated to a single line in the hero. Long copy was
  // pushing the CTAs off the right and stacking the identity column
  // over the avatar on mobile, so we hard-clamp to one line and route
  // the full copy through the 'Read more' modal. Threshold is low
  // (60 chars) — anything that's likely to ellipse in a 52ch column
  // gets the affordance so we don't silently hide useful copy.
  const isLongBio = !!bio && bio.length > 60;

  // Reveal timing for hero overlay (matches Hero.tsx home pattern)
  const bgAnim = reduce
    ? undefined
    : {
        initial: { scale: 1.04 },
        animate: { scale: 1 },
        transition: { duration: 0.8, ease },
      };
  const overlayAnim = reduce
    ? undefined
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.7, ease, delay: 0.2 },
      };

  return (
    <section
      aria-labelledby="storefront-name"
      className="relative isolate overflow-hidden bg-[var(--surface)]"
    >
      {/* Discreet 'back to Blyss' affordance — the main marketplace
          header is suppressed on this route (creator owns the page),
          so this is the only persistent way back to the marketplace.
          Top-left, low-contrast, doesn't compete with the creator's
          name. */}
      <Link
        href="/marketplace"
        className={cn(
          "absolute left-4 top-4 z-20 inline-flex h-9 items-center gap-1.5 rounded-md px-3 font-sans text-[12px] font-medium uppercase tracking-[0.1em] transition-colors md:left-8 md:top-6",
          bannerUrl
            ? "bg-black/30 text-white/85 backdrop-blur-md hover:bg-black/45 hover:text-white"
            : "border border-[var(--border)] bg-[var(--background)]/80 text-[var(--text-secondary)] backdrop-blur hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]",
        )}
        aria-label="Back to Blyss marketplace"
      >
        <FiArrowLeft size={14} aria-hidden="true" />
        Blyss
      </Link>

      {/* Cart + account controls live in the sticky StorefrontTabs bar
          directly below this hero (see StorefrontActionBar), so they ride
          along with the bar on scroll instead of scrolling away with the
          banner. Not duplicated here. */}
      {/* Banner — 16:9 when an image is provided. When there's no image we
          render a SHORT single-tone editorial block (no scrim) to avoid the
          visual two-banner stack the dark scrim would otherwise create over
          a flat fallback color. */}
      {bannerUrl ? (
        <motion.div
          {...(bgAnim ?? {})}
          className="relative h-[280px] w-full sm:h-[340px] md:h-[400px] lg:h-[440px]"
        >
          <OptimizedImage
            src={bannerUrl}
            alt=""
            fill
            sizes="100vw"
            priority
            className="h-full w-full object-cover"
          />
          {/*
            Scrim sizing notes:
            - The banner is height-capped (not aspect-ratio driven) so the
              identity overlay (avatar + name + handle + bio + CTAs) is always
              visible above the fold on landing — previously a full-bleed
              aspect-[16/9] banner rendered ~1080px tall on desktop and pushed
              the name below the fold.
            - Mobile: full-banner darken (h-full) so the overlay text reads.
            - md+: bottom 60% darken so the photo's subject stays visible while
              the overlay still has enough contrast.
            Per §15.4, NOT a gradient — solid rgba block.
          */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-full bg-[rgba(15,14,12,0.55)] md:h-[60%]" />
        </motion.div>
      ) : (
        // No banner: a tonal block sized to the overlay's natural height.
        // No scrim, no aspect ratio. Overlay below renders in dark text.
        <div className="h-[280px] w-full bg-[var(--surface)] md:h-[240px]" />
      )}

      {/* Overlay content — anchored bottom-left of the banner via absolute
          positioning on the section. Container width matches the rest of
          the marketplace surfaces (max 1280, px-6 / md:px-16). */}
      <motion.div
        {...(overlayAnim ?? {})}
        className="absolute inset-x-0 bottom-0"
      >
        <div className="mx-auto max-w-[1280px] px-6 pb-6 md:px-16 md:pb-14">
          <div className="flex flex-col items-stretch gap-5 md:flex-row md:items-end md:justify-between md:gap-8">
            {/* Identity column. Mobile: stack vertical so the bio doesn't
                squeeze against the avatar; desktop: side-by-side aligned to
                the baseline. min-w-0 + w-full on the wrapper so the bio's
                truncate cascades correctly through the flex tree (without
                this, max-w-[52ch] on the bio breaks out of mobile viewport). */}
            <div className="flex w-full min-w-0 flex-col items-start gap-4 md:flex-row md:items-end md:gap-5">
              {/* Avatar 56px mobile / 88px desktop. Smaller on mobile so
                  it sits visually below the 'Back to Blyss' pill without
                  competing with it for the top-of-page anchor. */}
              <div className="relative h-[56px] w-[56px] shrink-0 overflow-hidden rounded-full bg-[var(--surface-sunken)] ring-2 ring-[var(--background)] md:h-[88px] md:w-[88px]">
                <OptimizedImage
                  src={avatarUrl ?? undefined}
                  alt={`${name} avatar`}
                  fill
                  sizes="88px"
                  priority
                />
              </div>

              {/* Name + handle + bio + city. Text color depends on whether
                  a banner image is present (white over scrim) or absent
                  (dark over the tonal surface block). w-full + min-w-0
                  is required for the truncate inside .bio to behave on
                  narrow mobile viewports. */}
              <div
                className={cn(
                  "w-full min-w-0 pb-1",
                  bannerUrl ? "text-white" : "text-[var(--text-primary)]",
                )}
              >
                <div className="flex items-start gap-3">
                  <h1
                    id="storefront-name"
                    className={cn(
                      "min-w-0 flex-1 break-words font-display font-semibold leading-[1.05] tracking-[-0.02em]",
                      "text-[clamp(26px,4vw,48px)]",
                    )}
                  >
                    {name}
                  </h1>
                  {/* Compact 'Tip' inline beside the name. Smaller +
                      icon-led so it doesn't dominate the hero like
                      the previous full-width CTA did, but still
                      visible above the fold. */}
                  {tipEnabled && (
                    <button
                      type="button"
                      onClick={onTipClick}
                      aria-label={`Tip ${name}`}
                      className={cn(
                        "mt-1 inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 font-sans text-[12px] font-medium uppercase tracking-[0.1em] transition-colors",
                        bannerUrl
                          ? "bg-white/15 text-white backdrop-blur-md hover:bg-white/25"
                          : "border border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[var(--surface-sunken)]",
                      )}
                    >
                      <FiHeart size={13} aria-hidden="true" />
                      Tip
                    </button>
                  )}
                </div>
                <div
                  className={cn(
                    "mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-[14px]",
                    bannerUrl ? "text-white/75" : "text-[var(--text-muted)]",
                  )}
                >
                  <span
                    className={cn(
                      "font-medium",
                      bannerUrl
                        ? "text-white/85"
                        : "text-[var(--text-secondary)]",
                    )}
                  >
                    @{slug}
                  </span>
                  {city && (
                    <>
                      <span
                        aria-hidden="true"
                        className={
                          bannerUrl
                            ? "text-white/40"
                            : "text-[var(--border-strong)]"
                        }
                      >
                        ·
                      </span>
                      <span>{city}</span>
                    </>
                  )}
                </div>
                {bio && (
                  <div className="mt-2 flex w-full max-w-full items-baseline gap-2 md:max-w-[52ch]">
                    <p
                      className={cn(
                        // Single line, smaller font (13px), truncate
                        // with ellipsis. Keeps the hero compact and
                        // CTAs anchored. The wrapping div constrains
                        // width to the parent column on mobile (where
                        // 52ch can be wider than the viewport) and
                        // caps at 52ch on desktop for readability.
                        "min-w-0 flex-1 truncate font-sans text-[13px] leading-[1.5] md:text-[14px]",
                        bannerUrl
                          ? "text-white/80"
                          : "text-[var(--text-secondary)]",
                      )}
                    >
                      {bio}
                    </p>
                    {isLongBio && (
                      <button
                        type="button"
                        onClick={() => setBioOpen(true)}
                        className={cn(
                          "shrink-0 font-sans text-[12px] font-medium underline-offset-4 hover:underline",
                          bannerUrl
                            ? "text-white/85 hover:text-white"
                            : "text-[var(--accent)]",
                        )}
                      >
                        Read more
                      </button>
                    )}
                  </div>
                )}
                {/* Per-creator stats — Products · Sold · Earned. Plain
                    numerics, no badges, no stars. Hidden when all three
                    are zero so a fresh storefront stays clean. */}
                {(() => {
                  const fragments: string[] = [];
                  if (productsCount > 0) {
                    fragments.push(
                      `${productsCount} ${productsCount === 1 ? "product" : "products"}`,
                    );
                  }
                  if (totalOrders > 0) {
                    fragments.push(`${formatStatCount(totalOrders)} sold`);
                  }
                  if (totalEarned > 0) {
                    fragments.push(`${formatStatMoney(totalEarned)} earned`);
                  }
                  if (fragments.length === 0) return null;
                  return (
                    <p
                      className={cn(
                        "mt-2 font-sans text-[12px] tabular-nums",
                        bannerUrl
                          ? "text-white/75"
                          : "text-[var(--text-secondary)]",
                      )}
                    >
                      {fragments.join(" · ")}
                    </p>
                  );
                })()}
              </div>
            </div>

            {/* Subscribe lives in the Subscriptions tab, not the hero —
                the hero stays clean for identity. (Removed the inline
                Subscribe CTA per design decision: this is a creator
                storefront, not a YouTube channel.) */}
          </div>
        </div>
      </motion.div>

      {/* Full-screen bio modal — opened by 'Read more' on the hero.
          Custom Blyss-styled dialog with motion (paper card, warm scrim,
          smooth ease, slides up on mobile / scales-in on desktop). The
          shadcn Dialog had a generic look that didn't match the rest of
          the storefront chrome. Portaled to <body> so the hero's banner
          scale transform doesn't trap it in the hero's stacking context. */}
      {bio && (
        <BlyssDialog
          open={bioOpen}
          onOpenChange={setBioOpen}
          maxWidth={640}
          titleId="storefront-bio-title"
        >
          <BlyssDialogHeader>
            <BlyssDialogEyebrow>About</BlyssDialogEyebrow>
            <BlyssDialogTitle id="storefront-bio-title">
              {name}
            </BlyssDialogTitle>
          </BlyssDialogHeader>
          <BlyssDialogBody>
            <p className="whitespace-pre-line font-sans text-[15px] leading-[1.6] text-[var(--text-secondary)]">
              {bio}
            </p>
          </BlyssDialogBody>
        </BlyssDialog>
      )}
    </section>
  );
};

// ───────────────────────────────────────────────────────────────────
// Stat formatters — match the directory cards so a creator's
// numbers read identically across surfaces. Lifted into module
// scope so each render doesn't re-create the closures.
// ───────────────────────────────────────────────────────────────────

const formatStatCount = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

const formatStatMoney = (minor: number): string => {
  // Settlements are KES today; FX-aware display lands when we expand
  // beyond Kenya.
  const major = Math.round((minor || 0) / 100);
  if (major >= 1_000_000) return `KSh ${(major / 1_000_000).toFixed(1)}M`;
  if (major >= 1_000) return `KSh ${(major / 1_000).toFixed(1)}K`;
  return `KSh ${major}`;
};
