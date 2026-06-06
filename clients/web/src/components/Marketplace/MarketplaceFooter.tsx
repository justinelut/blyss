/* Hallmark · component: footer · archetype: Ft1 mast-headed
 * theme: blyss-design (warm aged-paper --surface tone)
 * sections: Brand mast (wordmark + tagline + social) · 3 link columns
 *           (Browse · Sell · Blyss) · Reach · Region switcher · copyright
 * contrast: pass · slop: pass (gates 52, 60)
 *
 * Reference DNA: Aimé Leon Dore + Adele Dejak — brand-led footer, NOT the
 * AI-default Ft3 (4-col link grid + tiny copyright). The brand mast carries
 * weight; link columns are minor citations underneath. Region/currency
 * switcher in the bottom row mirrors Adele Dejak's pattern (header has the
 * primary control; footer surfaces it for SEO + secondary discoverability).
 */
import Link from 'next/link'
import { FiInstagram, FiTwitter } from 'react-icons/fi'
import { CountrySwitcher } from './CountrySwitcher'
import { BlyssLogo } from '@/design'

const footerColumns = [
  {
    heading: 'Browse',
    links: [
      { href: '/marketplace', label: 'All products' },
      { href: '/marketplace', label: 'Categories' },
      { href: '/creators', label: 'Creators' },
      { href: '/marketplace?type=subscription', label: 'Subscriptions' },
    ],
  },
  {
    heading: 'Sell',
    links: [
      { href: '/start', label: 'Start selling' },
      { href: '/help', label: 'Help center' },
      { href: '/help#payouts', label: 'Payouts' },
      { href: '/help#mpesa', label: 'M-Pesa setup' },
    ],
  },
  {
    heading: 'Blyss',
    links: [
      { href: '/about', label: 'About' },
      { href: '/help', label: 'Help' },
      { href: '/terms', label: 'Terms' },
      { href: '/privacy', label: 'Privacy' },
      { href: '/acceptable-use', label: 'Acceptable use' },
      { href: '/refunds', label: 'Refunds' },
    ],
  },
]

const socialLinks = [
  { href: 'https://instagram.com/blyss.co.ke', label: 'Instagram', Icon: FiInstagram },
  { href: 'https://x.com/blyss_co_ke', label: 'X / Twitter', Icon: FiTwitter },
]

/**
 * MarketplaceFooter — footer for the public marketplace surface.
 *
 * Per plan §6.1 step 10: wordmark + tagline, three small link columns
 * (Browse · Sell · Blyss), social icons in muted accent, copyright in 12px
 * tracked uppercase.
 *
 * Background uses --surface (the warm aged-paper tone) so the footer sits
 * visually on a different layer than the page body.
 */
export const MarketplaceFooter = () => {
  return (
    <footer className="bg-[var(--surface)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-[1280px] px-6 py-20 md:px-16 md:py-28">
        {/* Top row: wordmark + tagline + nav columns */}
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-16">
          {/* Brand column */}
          <div className="md:col-span-5">
            <BlyssLogo size="xl" />
            <p className="mt-4 max-w-[28ch] text-[15px] leading-[1.5] text-[var(--text-secondary)]">
              The modern modern marketplace for digital products. Templates, ebooks,
              beats, courses, subscription tiers. Card or mobile money.
            </p>
            <div className="mt-8 flex items-center gap-4">
              {socialLinks.map(({ href, label, Icon }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]"
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Three nav columns */}
          {footerColumns.map((col) => (
            <div key={col.heading} className="md:col-span-2">
              <h3 className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                {col.heading}
              </h3>
              <ul className="mt-5 space-y-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="font-sans text-[14px] text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Spacer + Reach column */}
          <div className="md:col-span-1">
            <h3 className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              Reach
            </h3>
            <ul className="mt-5 space-y-3">
              <li>
                <a
                  href="mailto:hello@blyss.co.ke"
                  className="font-sans text-[14px] text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom row: copyright + region switcher */}
        <div className="mt-20 flex flex-col items-start justify-between gap-4 border-t border-[var(--border)] pt-8 md:flex-row md:items-center">
          <span className="font-sans text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
            © {new Date().getFullYear()} Blyss · Nairobi · Made in Kenya
          </span>
          <div className="flex items-center gap-3">
            <span className="font-sans text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              Region
            </span>
            <CountrySwitcher />
          </div>
        </div>
      </div>
    </footer>
  )
}
