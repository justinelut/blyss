import ArrowOutwardOutlined from '@mui/icons-material/ArrowOutwardOutlined'
import Link from 'next/link'
import { PropsWithChildren } from 'react'
import { PolarLogotype } from '../Layout/Public/PolarLogotype'
import { CookiePreferencesButton } from '../Privacy/CookiePreferencesButton'

const Footer = () => {
  return (
    <div className="mt-16 flex w-full flex-col items-center gap-y-12 bg-gray-50 dark:bg-black">
      <div className="flex w-full flex-col items-center px-6 py-16 md:max-w-3xl md:px-0 lg:py-32 xl:max-w-6xl">
        <div className="grid w-full grid-cols-1 gap-12 md:grid-cols-2 md:justify-between md:gap-16 lg:grid-cols-6">
          <div className="flex h-full flex-1 flex-col justify-between gap-y-6 md:col-span-2">
            <span className="text-black md:ml-0">
              <PolarLogotype
                className="ml-2 md:ml-0"
                logoVariant="logotype"
                size={120}
              />
            </span>
            <div className="flex flex-col gap-y-6">
              <Link
                href="/start"
                className="flex w-fit flex-row items-center gap-x-2 border-b border-black pb-0.5 dark:border-white"
              >
                <span>Become a Creator</span>
                <ArrowOutwardOutlined fontSize="inherit" />
              </Link>
              <span className="dark:text-polar-500 w-full text-gray-500">
                &copy; Polar Software, Inc. {new Date().getFullYear()}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-y-4 text-sm">
            <h3 className="dark:text-polar-500 text-gray-500">Marketplace</h3>
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
            <h3 className="dark:text-polar-500 text-gray-500">Creators</h3>
            <div className="flex flex-col gap-y-3">
              <FooterLink href="/start">Become a Creator</FooterLink>
              <FooterLink href="/resources">Creator Resources</FooterLink>
              <FooterLink href="/features">Platform Features</FooterLink>
              <FooterLink href="https://polar.sh/docs">
                Documentation
              </FooterLink>
            </div>
          </div>
          <div className="flex flex-col gap-y-4 text-sm">
            <h3 className="dark:text-polar-500 text-gray-500">Company</h3>
            <div className="flex flex-col gap-y-3">
              <FooterLink href="/company">About Us</FooterLink>
              <FooterLink href="/blog">Blog</FooterLink>
              <FooterLink href="/customers">Success Stories</FooterLink>
              <FooterLink href="https://github.com/polarsource">
                GitHub
              </FooterLink>
              <FooterLink href="https://x.com/polar_sh">X / Twitter</FooterLink>
              <FooterLink href="https://discord.gg/Pnhfz3UThd">
                Discord
              </FooterLink>
              <FooterLink href="https://polar.sh/assets/brand/polar_brand.zip">
                Brand Assets
              </FooterLink>
            </div>
          </div>
          <div className="flex flex-col gap-y-4 text-sm">
            <h3 className="dark:text-polar-500 text-gray-500">Support</h3>
            <div className="flex flex-col gap-y-3">
              <FooterLink href="https://polar.sh/docs">Help Center</FooterLink>
              <FooterLink href="mailto:support@polar.sh">Contact Us</FooterLink>
              <FooterLink href="https://status.polar.sh">
                Service Status
              </FooterLink>
              <FooterLink href="https://polar.sh/legal/terms">
                Terms of Service
              </FooterLink>
              <FooterLink href="https://polar.sh/legal/privacy">
                Privacy Policy
              </FooterLink>
              <CookiePreferencesButton />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Footer

const FooterLinkClassnames =
  'dark:text-white dark:hover:text-polar-100 flex flex-row items-center gap-x-1 text-black transition-colors hover:text-gray-500'

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
