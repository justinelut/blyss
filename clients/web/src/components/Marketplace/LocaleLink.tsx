'use client'

/**
 * LocaleLink — drop-in `<Link>` replacement that prepends the visitor's
 * country segment so URLs always carry the locale (e.g. /us/marketplace,
 * /ke/product/123).
 *
 * Why not just use <Link>? When customer-facing components ship raw
 * `<Link href="/marketplace">`, the browser navigates to `/marketplace`, the
 * middleware 308-redirects to `/{country}/marketplace`, and the browser
 * follows. That works (the user lands at the correct URL) but adds a round-
 * trip and breaks Next.js prefetching. LocaleLink avoids both by writing the
 * correct prefixed URL up-front.
 *
 * Use LocaleLink for INTERNAL marketplace navigation. External URLs (mailto:,
 * https://, anchor #fragments) and internal-but-non-localized routes
 * (/dashboard, /oauth2/...) should continue to use the plain Link.
 */

import NextLink, { type LinkProps } from 'next/link'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { useCurrencyControls } from '@/components/Marketplace/CurrencyProvider'
import { localizeMarketplaceHref } from '@/lib/geo/path'

type LocaleLinkProps = Omit<LinkProps, 'href'> &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    href: string
    children?: ReactNode
  }

export function LocaleLink({ href, children, ...rest }: LocaleLinkProps) {
  const { country } = useCurrencyControls()
  const resolvedHref = localizeMarketplaceHref(href, country)

  return (
    <NextLink href={resolvedHref} {...rest}>
      {children}
    </NextLink>
  )
}

export default LocaleLink
