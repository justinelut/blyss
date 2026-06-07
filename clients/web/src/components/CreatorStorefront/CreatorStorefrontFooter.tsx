'use client'

/* Hallmark · component: storefront-footer · genre: editorial
 * theme: blyss-design (light cream + burnt orange #C2410C accent)
 * sections:
 *   - Creator wordmark (huge editorial display, accent dot)
 *   - Long-form bio (full version, no clamp — this is the long-form home
 *     for the description)
 *   - Reach: socials + public email + city
 *   - Tiny 'On Blyss' attribution line at the very bottom
 *
 * Reference DNA: Aimé Leon Dore + Adele Dejak — brand-led footer where
 * the creator's name is the visual anchor, not the platform's. The Blyss
 * mark appears only as a small attribution since the back-link in the
 * hero already covers the navigation case. The footer is intentionally
 * NOT the marketplace's standard Ft1 — it belongs to the creator on
 * this route.
 */

import Link from 'next/link'
import {
  FiArrowUpRight,
  FiGlobe,
  FiInstagram,
  FiMail,
  FiTwitter,
} from 'react-icons/fi'
import { cn } from '@/lib/utils'

interface SocialLinks {
  twitter?: string | null
  instagram?: string | null
  website?: string | null
}

export interface CreatorStorefrontFooterProps {
  /** Creator display name */
  name: string
  /** URL slug — used for the @handle and the canonical share link */
  slug: string
  /** Long-form bio (no truncation here — this IS the long-form home). */
  bio?: string | null
  /** City — for the "Based in {city}" line */
  city?: string | null
  /** Public email — only shown when the creator opted-in to expose it. */
  email?: string | null
  /** Twitter / Instagram / Website handles */
  socials?: SocialLinks | null
}

export const CreatorStorefrontFooter = ({
  name,
  slug,
  bio,
  city,
  email,
  socials,
}: CreatorStorefrontFooterProps) => {
  const socialItems: Array<{
    href: string
    label: string
    Icon: typeof FiInstagram
  }> = []
  if (socials?.instagram) {
    const handle = socials.instagram.replace(/^@/, '')
    socialItems.push({
      href: `https://instagram.com/${handle}`,
      label: 'Instagram',
      Icon: FiInstagram,
    })
  }
  if (socials?.twitter) {
    const handle = socials.twitter.replace(/^@/, '')
    socialItems.push({
      href: `https://x.com/${handle}`,
      label: 'X / Twitter',
      Icon: FiTwitter,
    })
  }
  if (socials?.website) {
    const url = /^https?:\/\//.test(socials.website)
      ? socials.website
      : `https://${socials.website}`
    socialItems.push({
      href: url,
      label: 'Website',
      Icon: FiGlobe,
    })
  }

  const hasReach = socialItems.length > 0 || !!email || !!city
  const shareUrl = `https://blyss.co.ke/creators/${slug}`

  return (
    <footer
      className="bg-[var(--surface)] text-[var(--text-primary)]"
      aria-labelledby="creator-footer-mark"
    >
      <div className="mx-auto max-w-[1280px] px-6 py-20 md:px-16 md:py-28">
        {/* Creator mark — big editorial wordmark with accent dot. Mirrors
            the Blyss wordmark pattern in the marketplace footer but
            scaled up so the creator's name carries the brand on this
            page, not Blyss. */}
        <div>
          <span className="relative inline-block">
            <span
              id="creator-footer-mark"
              className="font-display font-bold tracking-[-0.03em] select-none text-[clamp(48px,8vw,96px)] leading-[0.95]"
            >
              {name}
            </span>
            <span
              aria-hidden="true"
              className="absolute right-[-14px] bottom-[8px] h-[10px] w-[10px] rounded-full bg-[var(--accent)] md:right-[-18px] md:bottom-[12px] md:h-[14px] md:w-[14px]"
            />
          </span>
          <p className="mt-3 font-sans text-[14px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
            @{slug}
            {city ? <> &middot; Based in {city}</> : null}
          </p>
        </div>

        {/* Long-form bio + reach grid */}
        <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-16">
          {/* Long-form bio. The hero shows a clamped one-line teaser;
              this is the canonical home for the full description. */}
          {bio?.trim() && (
            <div className="md:col-span-7">
              <h3 className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                About
              </h3>
              <p className="mt-5 max-w-[64ch] whitespace-pre-line font-sans text-[16px] leading-[1.65] text-[var(--text-secondary)]">
                {bio}
              </p>
            </div>
          )}

          {/* Reach column — socials + email + city. Hidden when the
              creator hasn't supplied any of them so the footer doesn't
              read empty. */}
          {hasReach && (
            <div
              className={cn(
                bio?.trim() ? 'md:col-span-5' : 'md:col-span-12',
              )}
            >
              <h3 className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Reach
              </h3>
              <ul className="mt-5 space-y-3">
                {socialItems.map(({ href, label, Icon }) => (
                  <li key={href}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-3 font-sans text-[15px] text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
                    >
                      <Icon
                        size={16}
                        className="text-[var(--text-muted)] transition-colors group-hover:text-[var(--accent)]"
                        aria-hidden="true"
                      />
                      {label}
                      <FiArrowUpRight
                        size={13}
                        aria-hidden="true"
                        className="text-[var(--text-muted)] transition-all group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
                      />
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
                        size={16}
                        className="text-[var(--text-muted)] transition-colors group-hover:text-[var(--accent)]"
                        aria-hidden="true"
                      />
                      {email}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Tiny attribution row — Blyss mark stays the navigation anchor
            via the back-link in the hero; this is just the canonical
            'made on Blyss' line. */}
        <div className="mt-20 flex flex-col items-start justify-between gap-3 border-t border-[var(--border)] pt-8 md:flex-row md:items-center">
          <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
            <span aria-label="copyright">&copy;</span>{' '}
            {new Date().getFullYear()} {name}
          </p>
          <Link
            href="/marketplace"
            className="font-sans text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)] underline-offset-4 transition-colors hover:text-[var(--accent)] hover:underline"
            aria-label="Powered by Blyss · go to marketplace"
          >
            Powered by Blyss
          </Link>
        </div>

        {/* Sharable link in tiny mono — for creators copy-pasting their
            storefront URL into bios. */}
        <p className="mt-3 font-sans text-[11px] text-[var(--text-muted)]">
          {shareUrl}
        </p>
      </div>
    </footer>
  )
}
