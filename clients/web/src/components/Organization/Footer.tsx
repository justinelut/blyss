import ArrowOutwardOutlined from '@mui/icons-material/ArrowOutwardOutlined'
import Link from 'next/link'
import { PropsWithChildren } from 'react'
import { BlyssLogo } from '@/design'
import { CookiePreferencesButton } from '../Privacy/CookiePreferencesButton'

const Footer = () => {
  return (
    <footer className="mt-16 flex w-full flex-col items-center gap-y-12 bg-[var(--surface)] dark:bg-stone-900">
      <div className="flex w-full flex-col items-center px-6 py-16 md:max-w-3xl md:px-0 lg:py-32 xl:max-w-6xl">
        <div className="grid w-full grid-cols-1 gap-12 md:grid-cols-2 md:justify-between md:gap-16 lg:grid-cols-6">
          <div className="flex h-full flex-1 flex-col justify-between gap-y-6 md:col-span-2">
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
              <FooterLink href="/creators">Featured Creators</FooterLink>
              <FooterLink href="/downloads">Downloads</FooterLink>
              <FooterLink href="/cart">Shopping Cart</FooterLink>
              <FooterLink href="/wishlist">Wishlist</FooterLink>
            </div>
          </div>
          <div className="flex flex-col gap-y-4 text-sm">
            <h3 className="text-[#594139] dark:text-stone-500">Creators</h3>
            <div className="flex flex-col gap-y-3">
              <FooterLink href="/start">Become a Creator</FooterLink>
              <FooterLink href="/resources">Creator Resources</FooterLink>
              <FooterLink href="/features">Platform Features</FooterLink>
              <FooterLink href="https://blyss.co.ke/help">
                Documentation
              </FooterLink>
            </div>
          </div>
          <div className="flex flex-col gap-y-4 text-sm">
            <h3 className="text-[#594139] dark:text-stone-500">Company</h3>
            <div className="flex flex-col gap-y-3">
              <FooterLink href="/company">About Us</FooterLink>
              <FooterLink href="/blog">Blog</FooterLink>
              <FooterLink href="/customers">Success Stories</FooterLink>
              <FooterLink href="https://github.com/polarsource">
                Polar.sh (upstream)
              </FooterLink>
              <FooterLink href="https://x.com/blyss_co_ke">X / Twitter</FooterLink>
              <FooterLink href="https://blyss.co.ke/discord">
                Discord
              </FooterLink>
              <FooterLink href="https://cdn.blyss.co.ke/brand/blyss_brand.zip">
                Brand Assets
              </FooterLink>
            </div>
          </div>
          <div className="flex flex-col gap-y-4 text-sm">
            <h3 className="text-[#594139] dark:text-stone-500">Support</h3>
            <div className="flex flex-col gap-y-3">
              <FooterLink href="https://blyss.co.ke/help">Help Center</FooterLink>
              <FooterLink href="mailto:support@blyss.co.ke">Contact Us</FooterLink>
              <FooterLink href="https://status.blyss.co.ke">
                Service Status
              </FooterLink>
              <FooterLink href="https://blyss.co.ke/terms">
                Terms of Service
              </FooterLink>
              <FooterLink href="https://blyss.co.ke/privacy">
                Privacy Policy
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
