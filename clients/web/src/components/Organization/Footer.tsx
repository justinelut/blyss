import ArrowOutwardOutlined from '@mui/icons-material/ArrowOutwardOutlined'
import Link from 'next/link'
import { PropsWithChildren } from 'react'
import { BlyssLogo } from '@/design'
import { CookiePreferencesButton } from '../Privacy/CookiePreferencesButton'

/**
 * Marketplace footer.
 *
 * Every link in here was verified against the routes under
 * `app/(main)/`. Broken paths (`/downloads`, `/resources`, `/features`,
 * `/company`, `/blog`, `/customers`) were removed in 2026-06 — they
 * pointed at pages that never existed and rendered 404s in
 * production. Cross-domain links to `https://blyss.co.ke/...` were
 * also rewritten to internal Next.js `/...` paths so navigation
 * stays client-side instead of doing a full page reload back to the
 * same origin.
 *
 * If you add a new page, add it to the relevant column below. If
 * you remove a page, remove the link too.
 */
const Footer = () => {
  return (
    <footer className="mt-16 flex w-full flex-col items-center gap-y-12 bg-[var(--surface)] dark:bg-stone-900">
      <div className="flex w-full flex-col items-center px-6 py-16 md:max-w-3xl md:px-0 lg:py-32 xl:max-w-6xl">
        <div className="grid w-full grid-cols-1 gap-12 md:grid-cols-2 md:justify-between md:gap-16 lg:grid-cols-4">
          <div className="flex h-full flex-1 flex-col justify-between gap-y-6 md:col-span-2 lg:col-span-1">
            <span className="text-[var(--text-primary)] dark:text-[#fcf9f7] md:ml-0">
              <BlyssLogo size="lg" className="ml-2 md:ml-0" />
            </span>
            <div className="flex flex-col gap-y-6">
              <Link
                href="/start"
                className="flex w-fit flex-row items-center gap-x-2 border-b border-[#1b1c1b] pb-0.5 dark:border-white"
              >
                <span>Become a Creator</span>
                <ArrowOutwardOutlined fontSize="inherit" />
              </Link>
              <span className="w-full text-[#594139] dark:text-stone-500">
                &copy; Blyss Marketplace {new Date().getFullYear()}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-y-4 text-sm">
            <h3 className="text-[#594139] dark:text-stone-500">Marketplace</h3>
            <div className="flex flex-col gap-y-3">
              <FooterLink href="/marketplace">Browse Products</FooterLink>
              <FooterLink href="/category">Categories</FooterLink>
              <FooterLink href="/creators">Creators</FooterLink>
              <FooterLink href="/cart">Cart</FooterLink>
              <FooterLink href="/wishlist">Wishlist</FooterLink>
              <FooterLink href="/portal/orders">Your purchases</FooterLink>
            </div>
          </div>

          <div className="flex flex-col gap-y-4 text-sm">
            <h3 className="text-[#594139] dark:text-stone-500">Company</h3>
            <div className="flex flex-col gap-y-3">
              <FooterLink href="/start">Become a Creator</FooterLink>
              <FooterLink href="/about">About Us</FooterLink>
              <FooterLink href="/help">Help Center</FooterLink>
              <FooterLink href="https://x.com/blyss_co_ke">
                X / Twitter
              </FooterLink>
            </div>
          </div>

          <div className="flex flex-col gap-y-4 text-sm">
            <h3 className="text-[#594139] dark:text-stone-500">Legal</h3>
            <div className="flex flex-col gap-y-3">
              <FooterLink href="/terms">Terms of Service</FooterLink>
              <FooterLink href="/privacy">Privacy Policy</FooterLink>
              <FooterLink href="/refunds">Refunds Policy</FooterLink>
              <FooterLink href="/acceptable-use">Acceptable Use</FooterLink>
              <FooterLink href="mailto:support@blyss.co.ke">
                Contact Support
              </FooterLink>
              <CookiePreferencesButton />
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer

const FooterLinkClassnames =
  'flex flex-row items-center gap-x-1 text-[#1b1c1b] dark:text-white hover:text-[#a73400] dark:hover:text-[#a73400] transition-colors'

const FooterLink = (props: PropsWithChildren<{ href: string }>) => {
  const isExternal = props.href.toString().startsWith('http')

  if (isExternal) {
    return (
      <a className={FooterLinkClassnames} {...props}>
        {props.children}
      </a>
    )
  }

  return (
    <Link className={FooterLinkClassnames} {...props}>
      {props.children}
    </Link>
  )
}
