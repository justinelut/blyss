/**
 * Coerce any backend error shape into a safe display string for toasts +
 * inline error banners.
 *
 * FastAPI 422 returns detail as an ARRAY of {type, loc, msg, input}
 * validation errors — passing that to a JSX child blows up React with
 * 'Minified error #31: object with keys {type, loc, msg, input}'.
 * Stripe-style errors return detail as a string. Network failures
 * surface error.message. This helper handles all three uniformly so
 * any caller can render the result without runtime crashes.
 *
 * Used by every mutation hook (wishlist, donations, checkout, etc.)
 * that talks to the FastAPI backend.
 */
export function formatApiError(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback
  const e = error as {
    body?: { detail?: unknown }
    detail?: unknown
    message?: string
  }
  const detail = e.body?.detail ?? e.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    // FastAPI validation array — pick the first msg with a useful field
    // hint so the user sees "Field 'phone': required" not just "required".
    const first = detail[0] as
      | { msg?: string; loc?: unknown[] }
      | undefined
    if (first && typeof first.msg === 'string') {
      // Strip the conventional 'Value error, ' prefix that pydantic
      // wraps custom validators in — it reads as noise.
      const msg = first.msg.replace(/^Value error,?\s*/i, '')
      return msg
    }
  }
  if (typeof e.message === 'string') return e.message
  return fallback
}
