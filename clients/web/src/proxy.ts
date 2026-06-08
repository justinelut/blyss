import { schemas } from '@/lib/api'
import { nanoid } from 'nanoid'
import { RequestCookiesAdapter } from 'next/dist/server/web/spec-extension/adapters/request-cookies'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { COOKIE_MAX_AGE, DISTINCT_ID_COOKIE } from './experiments/constants'
import { COUNTRY_COOKIE, SUPPORTED_COUNTRIES, isSupportedCountry } from './lib/geo'
import { resolveGeo } from './lib/geo/middleware'
import { createServerSideAPI } from './utils/client'

const POLAR_AUTH_COOKIE_KEY =
  process.env.POLAR_AUTH_COOKIE_KEY || 'polar_session'

const IS_SANDBOX =
  (process.env.NEXT_PUBLIC_ENVIRONMENT ||
    process.env.VERCEL_ENV ||
    process.env.NEXT_PUBLIC_VERCEL_ENV) === 'sandbox'

// App routes allowed on sandbox — everything else (marketing, docs) is blocked
// Strings match by prefix, RegExps are tested directly
const SANDBOX_ALLOWED_PATHS: (string | RegExp)[] = [
  '/login',
  '/dashboard',
  '/start',
  '/onboarding',
  '/finance',
  '/settings',
  '/oauth2',
  '/checkout',
  '/verify-email',
  '/api',
  /^\/[^/]+\/portal(\/|$)/, // /:organization/portal
]

const AUTHENTICATED_ROUTES = [
  new RegExp('^/dashboard(/.*)?'),
  new RegExp('^/finance(/.*)?'),
  new RegExp('^/settings(/.*)?'),
  new RegExp('^/oauth2(/.*)?'),
]

const getOrCreateDistinctId = (
  request: NextRequest,
): { id: string; isNew: boolean } => {
  const existing = request.cookies.get(DISTINCT_ID_COOKIE)?.value
  if (existing) {
    return { id: existing, isNew: false }
  }
  return { id: `anon_${nanoid()}`, isNew: true }
}

const isForwardedRoute = (request: NextRequest): boolean => {
  if (request.nextUrl.pathname.startsWith('/docs/')) {
    return true
  }

  if (request.nextUrl.pathname.startsWith('/mintlify-assets/')) {
    return true
  }

  if (request.nextUrl.pathname.startsWith('/_mintlify/')) {
    return true
  }

  if (request.nextUrl.pathname.startsWith('/ingest/')) {
    return true
  }

  return false
}

const requiresAuthentication = (request: NextRequest): boolean => {
  if (isForwardedRoute(request)) {
    return false
  }

  return AUTHENTICATED_ROUTES.some((route) =>
    route.test(request.nextUrl.pathname),
  )
}

/**
 * Internal paths that bypass locale prefixing — dashboard, auth, host-app
 * rewrites, API, Next.js internals, well-known files. Public paths (every-
 * thing else) get the /{country}/ prefix.
 *
 * Examples:
 *   /dashboard/...        → internal (creator dashboard)
 *   /finance, /settings   → internal
 *   /onboarding           → internal
 *   /oauth2/...           → internal (auth flow)
 *   /api/..., /_next/...  → internal
 *   /_buy/..., /_my/...   → host rewrite targets (buy./my.)
 *   /checkout/...         → host rewrite target (buy.)
 *   /portal/...           → host rewrite target inside /_my
 *   /favicon.ico, /robots.txt, /sitemap.xml → static
 *
 * Anything else is "public" and lives under /{country}/.
 */
const INTERNAL_PATH_PATTERNS: RegExp[] = [
  /^\/dashboard(\/|$)/,
  /^\/finance(\/|$)/,
  /^\/settings(\/|$)/,
  /^\/onboarding(\/|$)/,
  /^\/oauth2(\/|$)/,
  /^\/api(\/|$)/,
  /^\/_next(\/|$)/,
  /^\/_buy(\/|$)/,
  /^\/_my(\/|$)/,
  /^\/checkout(\/|$)/,
  /^\/ingest(\/|$)/,
  /^\/monitoring(\/|$)/,
  /^\/docs(\/|$)/,
  /^\/_mintlify(\/|$)/,
  /^\/mintlify-assets(\/|$)/,
  /^\/[^/]+\/portal(\/|$)/, // /:org/portal
  /^\/portal(\/|$)/, // /portal — Blyss-level marketplace customer portal
  /^\/favicon\./,
  /^\/robots\.txt$/,
  /^\/sitemap\.xml$/,
  /^\/manifest\.webmanifest$/,
  /\.[a-z0-9]{2,5}$/i, // any file with extension (og-image.png, etc.)
]

const isInternalPath = (pathname: string): boolean => {
  // Strip a locale prefix first so /{country}/portal/... doesn't get
  // mis-classified as a /:org/portal/... internal path. Without this,
  // /ke/portal/ matched the per-org portal regex (org=ke), the proxy
  // skipped locale rewriting, and Next.js routed to
  // [organization]/portal with organization='ke' — 404 because no org
  // has slug 'ke'.
  const segment = extractLocaleSegment(pathname)
  const effective = segment ? segment.rest : pathname
  return INTERNAL_PATH_PATTERNS.some((re) => re.test(effective))
}

/**
 * Look up the authenticated user from the polar_session cookie. Returns
 * undefined when the cookie is missing or the API returns 401. Used by both
 * the locale-rewrite branch and the standard auth flow so authenticated
 * visitors on /us/marketplace etc. don't render as logged-out (the layout's
 * `getAuthenticatedUser()` reads the `x-polar-user` request header that this
 * function feeds — without it, the header reads the user as anonymous).
 */
const fetchUserFromCookie = async (
  request: NextRequest,
): Promise<schemas['UserRead'] | undefined> => {
  if (!request.cookies.has(POLAR_AUTH_COOKIE_KEY)) return undefined
  try {
    const api = await createServerSideAPI(
      request.headers,
      RequestCookiesAdapter.seal(request.cookies),
    )
    const { data, response } = await api.GET('/v1/users/me', {
      cache: 'no-cache',
    })
    if (!response.ok && response.status !== 401) {
      console.error(
        `[proxy] /v1/users/me unexpected status=${response.status}`,
      )
      return undefined
    }
    return data
  } catch (e) {
    console.error('[proxy] fetchUserFromCookie failed:', e)
    return undefined
  }
}

/**
 * Strip a leading /{country}/ segment if it's a supported country, otherwise
 * return null. Returns the country (lowercased) and the rest of the path.
 */
const extractLocaleSegment = (
  pathname: string,
): { country: string; rest: string } | null => {
  const match = pathname.match(/^\/([a-z]{2})(\/.*)?$/i)
  if (!match) return null
  const country = match[1].toLowerCase()
  if (!isSupportedCountry(country)) return null
  return { country, rest: match[2] || '/' }
}

const getLoginResponse = (request: NextRequest): NextResponse => {
  const redirectURL = request.nextUrl.clone()
  redirectURL.pathname = '/login'
  redirectURL.search = ''
  const returnTo = `${request.nextUrl.pathname}${request.nextUrl.search}`
  redirectURL.searchParams.set('return_to', returnTo)
  return NextResponse.redirect(redirectURL)
}

export async function proxy(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const { pathname } = request.nextUrl

  // --- Host-based routing (plan §6.0) ---
  // buy.blyss.co.ke → checkout route group
  if (host.startsWith('buy.') || /^buy\.blyss\./i.test(host)) {
    if (!pathname.startsWith('/checkout') && !pathname.startsWith('/_buy')) {
      const url = request.nextUrl.clone()
      url.pathname = pathname === '/' ? '/checkout' : `/checkout${pathname}`
      return NextResponse.rewrite(url)
    }
  }
  // my.blyss.co.ke → portal route group
  if (host.startsWith('my.') || /^my\.blyss\./i.test(host)) {
    if (!pathname.startsWith('/_my')) {
      const url = request.nextUrl.clone()
      url.pathname = `/_my${pathname === '/' ? '' : pathname}`
      return NextResponse.rewrite(url)
    }
  }
  // cdn.blyss.co.ke should never hit Next.js
  if (host.startsWith('cdn.') || /^cdn\.blyss\./i.test(host)) {
    return new NextResponse('Not Found', { status: 404 })
  }

  // --- Locale URL handling ---
  // Public marketplace routes are addressed as /{country}/<path> so the URL
  // reflects the visitor's region (us, ke, gb, ng, ...). Internal paths
  // (dashboard, auth, host-rewrite targets, API) bypass this entirely.
  //
  // Two cases:
  //  a) Pathname has a supported country prefix → REWRITE internally to the
  //     un-prefixed path so the existing route tree still matches; record the
  //     country/currency in headers.
  //  b) Pathname is a public path with NO country prefix → 308-REDIRECT to
  //     /{detected-country}/<path> so the URL bar reflects the region.
  //
  // The country segment is the URL's source of truth for currency; cookie
  // remains the manual-override fallback.
  if (!isInternalPath(pathname) && !isForwardedRoute(request)) {
    const segment = extractLocaleSegment(pathname)
    if (segment) {
      // (a) Locale-prefixed: rewrite to un-prefixed for Next.js routing.
      const url = request.nextUrl.clone()
      url.pathname = segment.rest
      const requestHeaders = new Headers(request.headers)
      // The URL takes priority over cookie + cf-ipcountry for currency.
      requestHeaders.set('x-blyss-country', segment.country)
      const countryToCurrency: Record<string, string> = {
        ke: 'kes', us: 'usd', gb: 'gbp', ng: 'ngn', gh: 'ghs', za: 'zar',
        de: 'eur', fr: 'eur', es: 'eur', it: 'eur', nl: 'eur', ie: 'eur',
        pt: 'eur',
      }
      requestHeaders.set('x-blyss-currency', countryToCurrency[segment.country] ?? 'usd')
      requestHeaders.set('x-blyss-pathname', segment.rest)
      // Auth lookup — if the visitor has a polar_session cookie, surface
      // them via x-polar-user so the layout's getAuthenticatedUser() picks
      // them up. Without this, /us/marketplace etc. always render as
      // logged-out (the bug surfaced after introducing locale rewrites).
      const user = await fetchUserFromCookie(request)
      if (user) {
        requestHeaders.set('x-polar-user', JSON.stringify(user))
      }
      const response = NextResponse.rewrite(url, {
        request: { headers: requestHeaders },
      })
      // Keep the cookie aligned with the URL choice so server-component
      // fetches off the request path (e.g. RSC) see the right country.
      response.cookies.set(COUNTRY_COOKIE, segment.country, {
        maxAge: COOKIE_MAX_AGE,
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      })
      return response
    } else {
      // (b) Un-prefixed public path → redirect to /{detected-country}/<path>.
      const geo = resolveGeo(request)
      const url = request.nextUrl.clone()
      url.pathname = `/${geo.country}${pathname === '/' ? '' : pathname}`
      return NextResponse.redirect(url, { status: 308 })
    }
  }

  // --- Original Polar proxy logic below ---

  // Do not run middleware for forwarded routes
  // @pieterbeulque added this because the `config.matcher` behavior below
  // doesn't appear to be working consistently with Vercel rewrites
  if (isForwardedRoute(request)) {
    return NextResponse.next()
  }

  // Sandbox: rewrite root to login, block non-app routes
  if (IS_SANDBOX) {
    const { pathname } = request.nextUrl

    if (pathname === '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.search = ''
      return NextResponse.redirect(url)
    }

    const isAllowed = SANDBOX_ALLOWED_PATHS.some((path) =>
      typeof path === 'string'
        ? pathname === path || pathname.startsWith(`${path}/`)
        : path.test(pathname),
    )

    if (!isAllowed) {
      // Rewrite to a non-existent path so Next.js renders the not-found page
      const url = request.nextUrl.clone()
      url.pathname = '/_sandbox_blocked'
      return NextResponse.rewrite(url, { status: 404 })
    }
  }

  // Redirect old customer query string URLs to path-based URLs
  const customersMatch = request.nextUrl.pathname.match(
    /^\/dashboard\/([^/]+)\/customers$/,
  )
  if (customersMatch && request.nextUrl.searchParams.has('customerId')) {
    const customerId = request.nextUrl.searchParams.get('customerId')
    const redirectURL = request.nextUrl.clone()
    redirectURL.pathname = `/dashboard/${customersMatch[1]}/customers/${customerId}`
    redirectURL.searchParams.delete('customerId')
    return NextResponse.redirect(redirectURL)
  }

  // Redirect old benefit query string URLs to path-based URLs
  const benefitsMatch = request.nextUrl.pathname.match(
    /^\/dashboard\/([^/]+)\/benefits$/,
  )
  if (benefitsMatch && request.nextUrl.searchParams.has('benefitId')) {
    const benefitId = request.nextUrl.searchParams.get('benefitId')
    const redirectURL = request.nextUrl.clone()
    redirectURL.pathname = `/dashboard/${benefitsMatch[1]}/products/benefits/${benefitId}`
    redirectURL.searchParams.delete('benefitId')
    return NextResponse.redirect(redirectURL)
  }

  // Redirect old checkout link query string URLs to path-based URLs
  const checkoutLinksMatch = request.nextUrl.pathname.match(
    /^\/dashboard\/([^/]+)\/products\/checkout-links$/,
  )
  if (
    checkoutLinksMatch &&
    request.nextUrl.searchParams.has('checkoutLinkId')
  ) {
    const checkoutLinkId = request.nextUrl.searchParams.get('checkoutLinkId')
    const redirectURL = request.nextUrl.clone()
    redirectURL.pathname = `/dashboard/${checkoutLinksMatch[1]}/products/checkout-links/${checkoutLinkId}`
    redirectURL.searchParams.delete('checkoutLinkId')
    return NextResponse.redirect(redirectURL)
  }

  // Redirect old meter query string URLs to path-based URLs
  const metersMatch = request.nextUrl.pathname.match(
    /^\/dashboard\/([^/]+)\/usage-billing\/meters$/,
  )
  if (metersMatch && request.nextUrl.searchParams.has('selectedMeter')) {
    const selectedMeter = request.nextUrl.searchParams.get('selectedMeter')
    const redirectURL = request.nextUrl.clone()
    redirectURL.pathname = `/dashboard/${metersMatch[1]}/products/meters/${selectedMeter}`
    redirectURL.searchParams.delete('selectedMeter')
    return NextResponse.redirect(redirectURL)
  }

  // Redirect deprecated path-based URLs to new structure
  // Events: /dashboard/{org}/usage-billing/events/* -> /dashboard/{org}/analytics/events/*
  const eventsPathMatch = request.nextUrl.pathname.match(
    /^\/dashboard\/([^/]+)\/usage-billing\/events(\/.*)?$/,
  )
  if (eventsPathMatch) {
    const redirectURL = request.nextUrl.clone()
    redirectURL.pathname = `/dashboard/${eventsPathMatch[1]}/analytics/events${eventsPathMatch[2] || ''}`
    return NextResponse.redirect(redirectURL, { status: 308 })
  }

  // Benefits: /dashboard/{org}/benefits/* -> /dashboard/{org}/products/benefits/*
  const benefitsPathMatch = request.nextUrl.pathname.match(
    /^\/dashboard\/([^/]+)\/benefits(\/.*)?$/,
  )
  if (benefitsPathMatch) {
    const redirectURL = request.nextUrl.clone()
    redirectURL.pathname = `/dashboard/${benefitsPathMatch[1]}/products/benefits${benefitsPathMatch[2] || ''}`
    return NextResponse.redirect(redirectURL, { status: 308 })
  }

  // Meters: /dashboard/{org}/usage-billing/meters/* -> /dashboard/{org}/products/meters/*
  const metersPathMatch = request.nextUrl.pathname.match(
    /^\/dashboard\/([^/]+)\/usage-billing\/meters(\/.*)?$/,
  )
  if (metersPathMatch) {
    const redirectURL = request.nextUrl.clone()
    redirectURL.pathname = `/dashboard/${metersPathMatch[1]}/products/meters${metersPathMatch[2] || ''}`
    return NextResponse.redirect(redirectURL, { status: 308 })
  }

  let user: schemas['UserRead'] | undefined = undefined

  if (request.cookies.has(POLAR_AUTH_COOKIE_KEY)) {
    const api = await createServerSideAPI(
      request.headers,
      RequestCookiesAdapter.seal(request.cookies),
    )
    const { data, response } = await api.GET('/v1/users/me', {
      cache: 'no-cache',
    })
    if (!response.ok && response.status !== 401) {
      console.error(
        `Error response: status=${response.status}, headers=${JSON.stringify(Object.fromEntries(response.headers.entries()))}`,
      )
      throw new Error(
        'Unexpected response status while fetching authenticated user',
      )
    }
    user = data
  }

  if (requiresAuthentication(request) && !user) {
    return getLoginResponse(request)
  }

  const { id: distinctId, isNew: isNewDistinctId } =
    getOrCreateDistinctId(request)

  const headers: Record<string, string> = {
    'x-polar-distinct-id': distinctId,
  }
  if (user) {
    headers['x-polar-user'] = JSON.stringify(user)
  }

  // Mirror the requested pathname into the request headers so server
  // components can read it via `headers()` and conditionally render layout
  // chrome (marketplace header/footer for public pages, none for /dashboard).
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-blyss-pathname', request.nextUrl.pathname)

  // --- Geo → currency resolution (plan: /ke /us etc; no FX conversion) ---
  // Resolve the visitor's country once, here, and expose the country +
  // currency to server components (via request headers) and the client (via a
  // readable cookie). Order: explicit cookie override → Cloudflare
  // cf-ipcountry → default US/USD. The marketplace then shows ONLY products
  // the creator priced in this currency.
  const geo = resolveGeo(request)
  requestHeaders.set('x-blyss-country', geo.country)
  requestHeaders.set('x-blyss-currency', geo.currency)

  const response = NextResponse.next({
    headers,
    request: { headers: requestHeaders },
  })

  // Persist the resolved country so the choice is stable + the client store
  // can hydrate from it without a flash. Non-httpOnly so client code reads it.
  if (geo.shouldSetCookie) {
    response.cookies.set(COUNTRY_COOKIE, geo.country, {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })
  }

  if (isNewDistinctId) {
    response.cookies.set(DISTINCT_ID_COOKIE, distinctId, {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - ingest (Posthog)
     * - monitoring (Sentry)
     * - docs, _mintlify, mintlify-assets (Mintlify)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|ingest|monitoring|docs|_mintlify|mintlify-assets|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
