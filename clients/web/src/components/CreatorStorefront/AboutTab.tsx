"use client";

import { useState } from "react";
import {
  FiCheck,
  FiCopy,
  FiFacebook,
  FiGithub,
  FiGlobe,
  FiInstagram,
  FiLinkedin,
  FiMail,
  FiSend,
  FiShare2,
  FiTwitter,
  FiYoutube,
} from "react-icons/fi";
import { typography } from "@/design";
import { LegalDoc } from "@/design/LegalDoc";
import { cn } from "@/lib/utils";

/**
 * Polar's native social platforms. Mirrors
 * server/polar/models/organization.py OrganizationSocialPlatforms enum.
 * Buyer-facing creator page renders one of these icons per entry.
 */
type PolarSocialPlatform =
  | "x"
  | "twitter"
  | "instagram"
  | "facebook"
  | "youtube"
  | "linkedin"
  | "github"
  | "tiktok"
  | "website"
  | "other";

export interface AboutTabSocialLinks {
  /** Polar's native socials list — preferred. Each entry is
   *  {platform, url}. The platform values match the dashboard
   *  editor's SOCIAL_PLATFORM_DOMAINS map. */
  socials?: Array<{ platform: string; url: string }> | null;

  /** Legacy 3-field shape (twitter / instagram / website) — kept
   *  for backwards compatibility while older clients still pass
   *  this. New code should populate `socials`. */
  twitter?: string | null;
  instagram?: string | null;
  website?: string | null;
}

export interface AboutTabProps {
  /** Display name */
  name: string;
  /** URL slug — used to build the canonical share link. */
  slug?: string | null;
  /** Long-form bio. Up to ~1000 chars per spec. May contain markdown. */
  bio?: string | null;
  /** Social handles — twitter / instagram / website */
  socials?: AboutTabSocialLinks | null;
  /** Public email — only shown when the creator opted-in to make it public.
   *  We never derive this from the auth user object; pass null when the
   *  creator hasn't elected to expose it. */
  email?: string | null;
}

interface SocialItem {
  href: string;
  label: string;
  Icon: typeof FiTwitter;
}

/**
 * AboutTab — long-form bio (markdown) + contact links.
 *
 * Per plan/07-pages.md §6.4 step 5:
 * - Long-form bio (markdown, up to 1000 chars) rendered with LegalDoc — same
 *   renderer used for legal pages and subscription perks.
 * - Contact links: creator's social handles + email if public.
 *
 * Layout: max 64ch column for the bio (matches §3.4 text column rule); social
 * links appear as a row below.
 */
export const AboutTab = ({
  name,
  slug,
  bio,
  socials,
  email,
}: AboutTabProps) => {
  // Build the social link list. Defensive trims + URL normalization. We do
  // NOT echo raw user-supplied URLs without scheme — coerce them through
  // `normalizeUrl` to avoid open-redirect-like surfaces and broken links.
  //
  // Resolution order: prefer Polar's native `socials` list (covers all
  // 8+ platforms) when present; fall back to the legacy 3-field shape
  // (twitter/instagram/website) for backwards compatibility.
  const items: SocialItem[] = [];

  const platformIcon = (platform: string): typeof FiTwitter => {
    switch (platform.toLowerCase()) {
      case "x":
      case "twitter":
        return FiTwitter;
      case "instagram":
        return FiInstagram;
      case "facebook":
        return FiFacebook;
      case "youtube":
        return FiYoutube;
      case "linkedin":
        return FiLinkedin;
      case "github":
        return FiGithub;
      case "website":
        return FiGlobe;
      default:
        return FiGlobe;
    }
  };
  const platformLabel = (platform: string): string => {
    switch (platform.toLowerCase()) {
      case "x":
        return "X";
      case "twitter":
        return "Twitter";
      case "instagram":
        return "Instagram";
      case "facebook":
        return "Facebook";
      case "youtube":
        return "YouTube";
      case "linkedin":
        return "LinkedIn";
      case "github":
        return "GitHub";
      case "tiktok":
        return "TikTok";
      case "website":
        return "Website";
      default:
        return "Link";
    }
  };

  if (socials?.socials && socials.socials.length > 0) {
    // Native Polar list path — preferred
    for (const entry of socials.socials) {
      if (!entry?.url?.trim()) continue;
      items.push({
        href: normalizeUrl(entry.url, "https://"),
        label: platformLabel(entry.platform || "other"),
        Icon: platformIcon(entry.platform || "other"),
      });
    }
  } else {
    // Legacy 3-field path
    if (socials?.twitter) {
      items.push({
        href: normalizeUrl(socials.twitter, "https://x.com/"),
        label: "X / Twitter",
        Icon: FiTwitter,
      });
    }
    if (socials?.instagram) {
      items.push({
        href: normalizeUrl(socials.instagram, "https://instagram.com/"),
        label: "Instagram",
        Icon: FiInstagram,
      });
    }
    if (socials?.website) {
      items.push({
        href: normalizeUrl(socials.website, "https://"),
        label: "Website",
        Icon: FiGlobe,
      });
    }
  }

  const hasBio = !!bio?.trim();
  const hasContacts = items.length > 0 || !!email;
  const hasShare = !!slug;

  if (!hasBio && !hasContacts && !hasShare) {
    return (
      <section className="mx-auto max-w-[1280px] px-6 py-16 md:px-16 md:py-24">
        <div className="max-w-[48ch]">
          <h2 className={cn(typography.h3, "text-[var(--text-primary)]")}>
            About {name}.
          </h2>
          <p
            className={cn(typography.body, "mt-4 text-[var(--text-secondary)]")}
          >
            {name} hasn&rsquo;t added a bio yet. Their work speaks for itself in
            the meantime — head back to All work to see it.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[1280px] px-6 py-16 md:px-16 md:py-24">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
        {/* Bio column — 8/12 on desktop */}
        <div className="lg:col-span-8">
          {hasBio && (
            <>
              <h2
                className={cn(typography.h3, "mb-6 text-[var(--text-primary)]")}
              >
                About {name}.
              </h2>
              <LegalDoc>{bio!.trim()}</LegalDoc>
            </>
          )}
        </div>

        {/* Contact / share column — 4/12 on desktop. Renders when the
            creator has any reach link OR the page has a shareable slug
            (always true on the storefront). The "Find them at" section
            hides itself when empty so the column reads cleanly with
            just the share row. */}
        {(hasContacts || hasShare) && (
          <aside className="lg:col-span-4 lg:sticky lg:top-24 lg:self-start">
            {hasContacts && (
              <>
                <h3 className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  Find them at
                </h3>
                <ul className="mt-5 flex flex-col gap-3">
                  {items.map(({ href, label, Icon }) => (
                    <li key={href}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-3 font-sans text-[15px] text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
                      >
                        <Icon
                          size={18}
                          strokeWidth={1.75}
                          className="text-[var(--text-muted)] transition-colors group-hover:text-[var(--accent)]"
                          aria-hidden="true"
                        />
                        <span>{label}</span>
                      </a>
                    </li>
                  ))}
                  {email && (
                    <li>
                      <a
                        href={`mailto:${email}`}
                        className="group inline-flex items-center gap-3 font-sans text-[15px] text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
                      >
                        <FiMail
                          size={18}
                          className="text-[var(--text-muted)] transition-colors group-hover:text-[var(--accent)]"
                          aria-hidden="true"
                        />
                        <span>Email</span>
                      </a>
                    </li>
                  )}
                </ul>
              </>
            )}

            {/* Share row — visitors who landed via the creator's bio
                link can pass the storefront on. Web Share API on mobile,
                explicit network buttons on desktop. */}
            {slug && <ShareRow name={name} slug={slug} />}
          </aside>
        )}
      </div>
    </section>
  );
};

interface ShareRowProps {
  name: string;
  slug: string;
}

/**
 * ShareRow — copy-link + WhatsApp / X / Facebook / Telegram / LinkedIn.
 *
 * Each link uses the platform's standard share URL with the creator's
 * canonical storefront URL pre-encoded. The 'Copy link' button uses
 * navigator.clipboard with a 2 s 'Copied' affordance — no toast required
 * since the button is right there.
 */
function ShareRow({ name, slug }: ShareRowProps) {
  const url = `https://blyss.co.ke/creators/${slug}`;
  const text = `Check out ${name} on Blyss`;
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Browsers without clipboard API (rare) silently no-op.
    }
  };

  const onNativeShare = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (
          navigator as Navigator & {
            share: (data: ShareData) => Promise<void>;
          }
        ).share({ title: name, text, url });
      } catch {
        // User cancelled — no-op.
      }
    }
  };

  const targets: Array<{
    href: string;
    label: string;
    Icon: typeof FiTwitter;
  }> = [
    {
      href: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
      label: "WhatsApp",
      Icon: FiSend,
    },
    {
      href: `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      label: "X",
      Icon: FiTwitter,
    },
    {
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      label: "Facebook",
      Icon: FiFacebook,
    },
    {
      href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      label: "Telegram",
      Icon: FiSend,
    },
    {
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      label: "LinkedIn",
      Icon: FiLinkedin,
    },
  ];

  return (
    <div className="mt-10 border-t border-[var(--border)] pt-6">
      <h3 className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        Share their work
      </h3>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {targets.map(({ href, label, Icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Share on ${label}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <Icon size={16} aria-hidden="true" />
          </a>
        ))}
        {/* Native Share API — only meaningful on mobile; the button shows
            on every device but on desktop it just no-ops if the API is
            absent. Saves a row when iOS / Android users want to send to
            an app we didn't enumerate (Signal, iMessage, Slack, etc.). */}
        <button
          type="button"
          onClick={onNativeShare}
          aria-label="Share via your device"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          <FiShare2 size={16} aria-hidden="true" />
        </button>
      </div>

      {/* Copy-link affordance with inline 'Copied' confirmation. The full
          URL is mono so creators can verify what they're pasting. */}
      <button
        type="button"
        onClick={onCopy}
        className="mt-3 inline-flex w-full items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 font-sans text-[12px] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
        aria-label="Copy storefront link"
      >
        <span className="truncate font-mono text-[11px]">{url}</span>
        <span className="inline-flex items-center gap-1.5 font-sans text-[11px] font-medium uppercase tracking-[0.1em]">
          {copied ? (
            <>
              <FiCheck size={13} aria-hidden="true" />
              Copied
            </>
          ) : (
            <>
              <FiCopy size={13} aria-hidden="true" />
              Copy
            </>
          )}
        </span>
      </button>
    </div>
  );
}

/**
 * Coerce a possibly-bare handle ("@user") or scheme-less URL ("blyss.co.ke")
 * into an absolute https URL. Strips a leading @ for handle-style entries
 * and prepends the platform's base URL when missing.
 */
function normalizeUrl(value: string, fallbackBase: string): string {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // Bare handle — strip leading "@" and append to base
  const withoutAt = trimmed.replace(/^@/, "");
  // Bare domain — prepend https
  if (/\./.test(withoutAt) && !withoutAt.includes(" ")) {
    return `https://${withoutAt.replace(/^\/+/, "")}`;
  }
  return `${fallbackBase}${encodeURIComponent(withoutAt)}`;
}
