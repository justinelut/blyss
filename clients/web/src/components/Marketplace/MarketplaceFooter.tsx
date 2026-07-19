/* Hallmark · component: footer · archetype: Ft1 mast-headed
 * Brand mast followed by a real marketplace index. Intrinsic tracks prevent
 * the 768px zero-width column and horizontal overflow from the old 12-column
 * layout.
 */
import Link from "./LocaleLink";
import { FiInstagram, FiTwitter } from "react-icons/fi";
import { CountrySwitcher } from "./CountrySwitcher";
import { NewsletterSignup } from "./NewsletterSignup";
import { BlyssLogo } from "@/design";

const footerColumns = [
  {
    heading: "Browse",
    links: [
      { href: "/marketplace", label: "All products" },
      { href: "/categories", label: "Categories" },
      { href: "/creators", label: "Creators" },
      { href: "/marketplace?type=subscription", label: "Subscriptions" },
    ],
  },
  {
    heading: "Sell",
    links: [
      { href: "/start", label: "Start selling" },
      { href: "/help", label: "Help center" },
      { href: "/help#payouts", label: "Payouts" },
      { href: "/help#mpesa", label: "M-Pesa setup" },
    ],
  },
  {
    heading: "Blyss",
    links: [
      { href: "/about", label: "About" },
      { href: "/help", label: "Help" },
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
      { href: "/acceptable-use", label: "Acceptable use" },
      { href: "/refunds", label: "Refunds" },
    ],
  },
];

const socialLinks = [
  {
    href: "https://instagram.com/blyss.co.ke",
    label: "Instagram",
    Icon: FiInstagram,
  },
  {
    href: "https://x.com/blyss_co_ke",
    label: "X / Twitter",
    Icon: FiTwitter,
  },
];

export const MarketplaceFooter = () => (
  <footer className="bg-[var(--surface)] text-[var(--text-primary)]">
    <div className="mx-auto max-w-[1280px] px-4 pt-14 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 md:px-8 md:pt-18 lg:px-16 lg:py-24">
      <div className="grid min-w-0 grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4 md:gap-x-8 lg:grid-cols-[minmax(280px,2fr)_repeat(4,minmax(0,1fr))] lg:gap-x-10">
        <div className="col-span-2 min-w-0 md:col-span-4 lg:col-span-1">
          <BlyssLogo size="xl" />
          <p className="mt-4 max-w-[34ch] font-sans text-[14px] leading-[1.55] text-[var(--text-secondary)]">
            Digital products and ongoing access from independent creators. Pay
            with the methods available in your region.
          </p>
          <div className="mt-6 flex items-center gap-2">
            {socialLinks.map(({ href, label, Icon }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex h-10 w-10 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]"
              >
                <Icon size={18} aria-hidden="true" />
              </a>
            ))}
          </div>
          <NewsletterSignup className="mt-7 max-w-md" />
        </div>

        {footerColumns.map((column) => (
          <nav key={column.heading} aria-label={`${column.heading} links`}>
            <h2 className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {column.heading}
            </h2>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-sans text-[14px] leading-[1.4] text-[var(--text-secondary)] hover:text-[var(--accent)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <nav aria-label="Contact links">
          <h2 className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Reach
          </h2>
          <ul className="mt-4 space-y-2.5">
            <li>
              <a
                href="mailto:hello@blyss.co.ke"
                className="font-sans text-[14px] text-[var(--text-secondary)] hover:text-[var(--accent)]"
              >
                Contact
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="mt-12 flex flex-col items-start justify-between gap-5 border-t border-[var(--border)] pt-6 md:mt-16 md:flex-row md:items-center">
        <span className="font-sans text-[10px] uppercase tracking-[0.13em] text-[var(--text-muted)] sm:text-[11px]">
          © {new Date().getFullYear()} Blyss · Nairobi · Made in Kenya
        </span>
        <div className="flex items-center gap-3">
          <span className="font-sans text-[10px] uppercase tracking-[0.13em] text-[var(--text-muted)] sm:text-[11px]">
            Region
          </span>
          <CountrySwitcher />
        </div>
      </div>
    </div>
  </footer>
);
