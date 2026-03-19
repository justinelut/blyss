/**
 * Session token management for guest cart functionality.
 *
 * Guest users need a session token to identify their cart across page loads.
 * The token is stored in a cookie and sent with all API requests via a custom header.
 *
 * Note: We use a regular cookie (not HTTP-only) because:
 * 1. HTTP-only cookies can only be set by the server
 * 2. We need to generate tokens client-side on first cart interaction
 * 3. The token is not sensitive - it only identifies a guest cart
 */

const SESSION_TOKEN_COOKIE_NAME = 'polar_guest_session'
const SESSION_TOKEN_HEADER_NAME = 'X-Guest-Session-Token'
const SESSION_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 // 7 days in seconds

/**
 * Generate a cryptographically secure random session token.
 * Uses the Web Crypto API for secure random generation.
 */
export function generateSessionToken(): string {
  // Generate 32 random bytes (256 bits)
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)

  // Convert to hex string (64 characters)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  )
}

/**
 * Get the current session token from cookies.
 * Returns null if no token exists.
 */
export function getSessionToken(): string | null {
  if (typeof document === 'undefined') {
    return null
  }

  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === SESSION_TOKEN_COOKIE_NAME) {
      return value
    }
  }

  return null
}

/**
 * Set the session token in a cookie.
 * The cookie is set with:
 * - 7 day expiration (matches cart item expiration)
 * - Secure flag (HTTPS only in production)
 * - SameSite=Lax (CSRF protection while allowing navigation)
 * - Path=/ (available across the entire site)
 */
export function setSessionToken(token: string): void {
  if (typeof document === 'undefined') {
    return
  }

  const isProduction = process.env.NODE_ENV === 'production'
  const secure = isProduction ? 'Secure;' : ''

  document.cookie = `${SESSION_TOKEN_COOKIE_NAME}=${token}; max-age=${SESSION_TOKEN_MAX_AGE}; path=/; SameSite=Lax; ${secure}`
}

/**
 * Clear the session token cookie.
 * Used after migration to user account or manual logout.
 */
export function clearSessionToken(): void {
  if (typeof document === 'undefined') {
    return
  }

  document.cookie = `${SESSION_TOKEN_COOKIE_NAME}=; max-age=0; path=/`
}

/**
 * Ensure a session token exists, creating one if necessary.
 * Returns the existing or newly created token.
 *
 * This should be called before any cart operation for guest users.
 */
export function ensureSessionToken(): string {
  let token = getSessionToken()

  if (!token) {
    token = generateSessionToken()
    setSessionToken(token)
  }

  return token
}

/**
 * Get the header name for the guest session token.
 * Used when configuring API clients.
 */
export function getSessionTokenHeaderName(): string {
  return SESSION_TOKEN_HEADER_NAME
}
