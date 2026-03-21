import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require authentication
const PROTECTED_ROUTES = ['/cart', '/wishlist']

// Routes that are public (no authentication required)
const PUBLIC_ROUTES = [
  '/',
  '/products',
  '/product',
  '/creators',
  '/help',
  '/login',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if the current path is a protected route
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route),
  )

  // If it's a protected route, check for authentication
  if (isProtectedRoute) {
    // Check for user data in the header (set by Next.js server-side)
    const userData = request.headers.get('x-polar-user')

    // If no user data, redirect to login with returnUrl
    if (!userData) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('return_to', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

// Configure which routes the middleware should run on
export const config = {
  matcher: ['/cart/:path*', '/wishlist/:path*'],
}
