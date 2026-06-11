'use client'

import { MOBILE_MEDIA_QUERY } from '@/utils/mobile'
import { redirect } from 'next/navigation'

/**
 * On the master/detail INDEX route (no item selected): on desktop, redirect
 * to the most recent item so the detail pane is always populated; on mobile,
 * render nothing so the parent layout shows the list view alone (no cramped
 * dual-pane on phones). Mirrors upstream Polar.
 */
export const MasterDetailIndex = ({ redirectTo }: { redirectTo: string }) => {
  const isBrowser = typeof window !== 'undefined'
  const isDesktop = isBrowser && !window.matchMedia(MOBILE_MEDIA_QUERY).matches

  if (isDesktop) {
    redirect(redirectTo)
  }

  return null
}
