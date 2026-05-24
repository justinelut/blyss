import { NextRequest, NextResponse } from 'next/server'

/**
 * Host-based routing middleware — plan §6.0 + §10.5
 *
 * Three public hostnames share the same Next.js app:
 *
 *   blyss.co.ke      → marketplace + dashboard + creator surfaces (default)
 *   buy.blyss.co.ke  → hosted checkout (Paystack flow + share-able links)
 *   my.blyss.co.ke   → customer portal (orders, subscriptions, files, perks)
 *
 * In dev (`localhost:3000`) we use path prefixes so a single host can test
 * all three surfaces:
 *
 *   /            → marketplace
 *   /_buy/...    → checkout
 *   /_my/...     → portal
 *
 * To test the production-like host routing in dev, edit /etc/hosts:
 *   127.0.0.1 blyss.local buy.blyss.local my.blyss.local
 * and visit http://blyss.local:3000 / http://buy.blyss.local:3000 / etc.
 */

const isCheckoutHost = (host: string): boolean =>
  host.startsWith('buy.') || /^buy\.blyss\./i.test(host)

const isPortalHost = (host: string): boolean =>
  host.startsWith('my.') || /^my\.blyss\./i.test(host)

const isCdnHost = (host: string): boolean =>
  host.startsWith('cdn.') || /^cdn\.blyss\./i.test(host)

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const { pathname, search } = request.nextUrl

  // CDN host — should be served by Traefik/MinIO directly, never hit Next.js.
  // If we somehow get here, return a 404.
  if (isCdnHost(host)) {
    return new NextResponse('Not Found', { status: 404 })
  }

  // Production: buy.blyss.co.ke
  if (isCheckoutHost(host)) {
    // Already inside checkout area? leave alone.
    if (pathname.startsWith('/_buy') || pathname.startsWith('/checkout')) {
      return NextResponse.next()
    }
    // Internal rewrite — looks like / on buy.blyss.co.ke, serves /_buy
    const url = request.nextUrl.clone()
    url.pathname = `/_buy${pathname === '/' ? '' : pathname}`
    return NextResponse.rewrite(url)
  }

  // Production: my.blyss.co.ke
  if (isPortalHost(host)) {
    if (pathname.startsWith('/_my')) return NextResponse.next()
    const url = request.nextUrl.clone()
    url.pathname = `/_my${pathname === '/' ? '' : pathname}`
    return NextResponse.rewrite(url)
  }

  // Development: localhost path prefixes pass through unchanged.
  // /_buy and /_my serve the corresponding route groups when present.

  // Default: marketplace surface (blyss.co.ke), no rewrite.
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match every path except:
    // - _next internals
    // - api routes (handled directly by Next or Polar API)
    // - static assets
    '/((?!_next/|api/|favicon|.*\\..*).*)',
  ],
}
