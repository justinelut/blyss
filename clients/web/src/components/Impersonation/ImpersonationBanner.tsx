'use client'

import { CONFIG } from '@/utils/config'
import { useEffect, useState } from 'react'

/**
 * ImpersonationBanner — sticky red bar at the top of the dashboard
 * that lets a backoffice admin exit an active impersonation session.
 *
 * Why we don't trust NEXT_PUBLIC_BACKOFFICE_URL alone:
 *
 * In production that env var was never wired through to the Next.js
 * build, so `${process.env.NEXT_PUBLIC_BACKOFFICE_URL}/impersonation/end`
 * stringified to literally "undefined/impersonation/end". The browser
 * resolved that as a relative URL against the current dashboard org
 * page and produced /dashboard/{slug}/undefined/impersonation/end —
 * a 404 the admin couldn't escape from. The exit link became unusable.
 *
 * The fix: fall back to CONFIG.BASE_URL (the API origin, always set
 * via NEXT_PUBLIC_API_URL in every deployed environment) plus the
 * static /backoffice mount path. The backoffice FastAPI app is mounted
 * under /backoffice on the API host (see polar/app.py:237), so
 * `${API_ORIGIN}/backoffice/impersonation/end` is the correct
 * absolute target whenever the dedicated env var is unset.
 *
 * If NEXT_PUBLIC_BACKOFFICE_URL IS set (e.g. dev / codespaces where
 * the backoffice runs on a different origin), we honor it.
 */
const ImpersonationBanner = () => {
  const [isImpersonating, setIsImpersonating] = useState(false)

  useEffect(() => {
    const checkCookie = () => {
      const cookies = document.cookie.split(';')
      const hasImpersonationCookie = cookies.some((cookie) =>
        cookie.trim().startsWith('polar_is_impersonating='),
      )
      setIsImpersonating(hasImpersonationCookie)
    }

    checkCookie()
    const interval = setInterval(checkCookie, 1000)

    return () => clearInterval(interval)
  }, [])

  if (!isImpersonating) {
    return null
  }

  // Resolve the backoffice exit URL with a hard-fallback that is
  // ALWAYS absolute — never let the browser walk back to the current
  // dashboard route on a missing env var.
  const backofficeBase =
    process.env.NEXT_PUBLIC_BACKOFFICE_URL ||
    `${CONFIG.BASE_URL}/backoffice`
  const exitHref = `${backofficeBase}/impersonation/end`

  return (
    <div className="sticky top-0 z-50 flex flex-row items-center justify-between bg-red-100 px-8 py-2 text-sm text-red-600 dark:bg-red-950">
      <div className="flex-[1_0_0]"></div>
      <div className="hidden flex-[1_0_0] font-medium md:block">
        You are currently impersonating another user
      </div>
      <div className="flex-[1_0_0] text-right">
        <a href={exitHref} className="font-bold hover:opacity-50">
          Exit impersonation
        </a>
      </div>
    </div>
  )
}

export default ImpersonationBanner
