'use client'

import { Mail, Globe, Instagram, Twitter } from 'lucide-react'
import { LegalDoc, typography } from '@/design'
import { cn } from '@/lib/utils'

export interface AboutTabSocialLinks {
  twitter?: string | null
  instagram?: string | null
  website?: string | null
}

export interface AboutTabProps {
  /** Display name */
  name: string
  /** Long-form bio. Up to ~1000 chars per spec. May contain markdown. */
  bio?: string | null
  /** Social handles — twitter / instagram / website */
  socials?: AboutTabSocialLinks | null
  /** Public email — only shown when the creator opted-in to make it public.
   *  We never derive this from the auth user object; pass null when the
   *  creator hasn't elected to expose it. */
  email?: string | null
}

interface SocialItem {
  href: string
  label: string
  Icon: typeof Twitter
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
export const AboutTab = ({ name, bio, socials, email }: AboutTabProps) => {
  // Build the social link list. Defensive trims + URL normalization. We do
  // NOT echo raw user-supplied URLs without scheme — coerce them through
  // `normalizeUrl` to avoid open-redirect-like surfaces and broken links.
  const items: SocialItem[] = []
  if (socials?.twitter) {
    items.push({
      href: normalizeUrl(socials.twitter, 'https://x.com/'),
      label: 'X / Twitter',
      Icon: Twitter,
    })
  }
  if (socials?.instagram) {
    items.push({
      href: normalizeUrl(socials.instagram, 'https://instagram.com/'),
      label: 'Instagram',
      Icon: Instagram,
    })
  }
  if (socials?.website) {
    items.push({
      href: normalizeUrl(socials.website, 'https://'),
      label: 'Website',
      Icon: Globe,
    })
  }

  const hasBio = !!bio?.trim()
  const hasContacts = items.length > 0 || !!email

  if (!hasBio && !hasContacts) {
    return (
      <section className="mx-auto max-w-[1280px] px-6 py-16 md:px-16 md:py-24">
        <div className="max-w-[48ch]">
          <h2 className={cn(typography.h3, 'text-[var(--text-primary)]')}>
            About {name}.
          </h2>
          <p
            className={cn(
              typography.body,
              'mt-4 text-[var(--text-secondary)]',
            )}
          >
            {name} hasn&rsquo;t added a bio yet. Their work speaks for itself in
            the meantime — head back to All work to see it.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-[1280px] px-6 py-16 md:px-16 md:py-24">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
        {/* Bio column — 8/12 on desktop */}
        <div className="lg:col-span-8">
          {hasBio && (
            <>
              <h2
                className={cn(typography.h3, 'mb-6 text-[var(--text-primary)]')}
              >
                About {name}.
              </h2>
              <LegalDoc>{bio!.trim()}</LegalDoc>
            </>
          )}
        </div>

        {/* Contact column — 4/12 on desktop */}
        {hasContacts && (
          <aside className="lg:col-span-4">
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
                    <Mail
                      size={18}
                      strokeWidth={1.75}
                      className="text-[var(--text-muted)] transition-colors group-hover:text-[var(--accent)]"
                      aria-hidden="true"
                    />
                    <span>Email</span>
                  </a>
                </li>
              )}
            </ul>
          </aside>
        )}
      </div>
    </section>
  )
}

/**
 * Coerce a possibly-bare handle ("@user") or scheme-less URL ("blyss.co.ke")
 * into an absolute https URL. Strips a leading @ for handle-style entries
 * and prepends the platform's base URL when missing.
 */
function normalizeUrl(value: string, fallbackBase: string): string {
  const trimmed = value.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  // Bare handle — strip leading "@" and append to base
  const withoutAt = trimmed.replace(/^@/, '')
  // Bare domain — prepend https
  if (/\./.test(withoutAt) && !withoutAt.includes(' ')) {
    return `https://${withoutAt.replace(/^\/+/, '')}`
  }
  return `${fallbackBase}${encodeURIComponent(withoutAt)}`
}
